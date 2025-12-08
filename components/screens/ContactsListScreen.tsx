"use client";

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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, ThemeTokens } from "../../theme/ThemeContext";

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { database } from "../../lib/database";
import { LocalContact } from "../../lib/database/models/LocalContact";
import { Q } from "@nozbe/watermelondb";

interface ContactsListScreenProps {
  onBack: () => void;
  onBatchAction?: (selectedIds: string[]) => void;
}

export default function ContactsListScreen({ onBack, onBatchAction }: ContactsListScreenProps) {
  const { tokens } = useTheme();
  const styles = React.useMemo(() => createStyles(tokens), [tokens]);

  const [contacts, setContacts] = useState<LocalContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Load contacts from database
  const loadContacts = useCallback(async () => {
    setLoading(true);
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
    }
  }, [searchQuery]);

  useEffect(() => {
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
  const toggleSelection = (contactId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(contactId)) {
        newSet.delete(contactId);
      } else {
        newSet.add(contactId);
      }
      return newSet;
    });
  };

  // Toggle select all
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(contacts.map((c) => c.id)));
    }
    setSelectAll(!selectAll);
  };

  // Handle batch action
  const handleBatchAction = () => {
    if (onBatchAction && selectedIds.size > 0) {
      onBatchAction(Array.from(selectedIds));
    }
  };

  // Render contact item
  const renderContact = ({ item }: { item: LocalContact }) => {
    const isSelected = selectedIds.has(item.id);

    return (
      <TouchableOpacity
        style={[
          styles.contactItem,
          isSelected && { backgroundColor: tokens.accent + "20" },
        ]}
        onPress={() => toggleSelection(item.id)}
        activeOpacity={0.7}
      >
        {/* Selection checkbox */}
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

        {/* Contact info */}
        <View style={styles.contactInfo}>
          <Text style={[styles.contactName, { color: tokens.textPrimary }]}>
            {item.displayName}
          </Text>
          {item.phone && (
            <Text style={[styles.contactDetail, { color: tokens.textSecondary }]}>
              {item.phone}
            </Text>
          )}
          {item.email && (
            <Text style={[styles.contactDetail, { color: tokens.textSecondary }]}>
              {item.email}
            </Text>
          )}
          {item.company && (
            <Text style={[styles.contactDetail, { color: tokens.muted }]}>
              {item.company}
            </Text>
          )}
        </View>

        {/* Synced indicator */}
        <View style={styles.syncStatus}>
          {item.isMatched ? (
            <View style={[styles.syncedBadge, { backgroundColor: tokens.accent + "30" }]}>
              <Ionicons name="checkmark" size={12} color={tokens.accent} />
              <Text style={{ color: tokens.accent, fontSize: 12, marginLeft: 4 }}>Synced</Text>
            </View>
          ) : (
            <View style={[styles.unsyncedBadge, { backgroundColor: tokens.muted + "30" }]}>
              <Text style={{ color: tokens.muted, fontSize: 12 }}>Not synced</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
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
      <View style={[styles.statsBar, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
        <Text style={[styles.statText, { color: tokens.textSecondary }]}>
          {contacts.length} total
        </Text>
        <Text style={[styles.statText, { color: tokens.accent }]}>
          {syncedCount} synced
        </Text>
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
          <TouchableOpacity
            style={[styles.batchButton, { backgroundColor: tokens.background }]}
            onPress={handleBatchAction}
          >
            <Text style={[styles.batchButtonText, { color: tokens.accent }]}>
              Create Clients
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
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
          <Ionicons name="people-outline" size={48} color={tokens.muted} style={{ marginBottom: 16 }} />
          <Text style={[styles.emptyText, { color: tokens.textSecondary }]}>
            No contacts found
          </Text>
          <Text style={[styles.emptySubtext, { color: tokens.muted }]}>
            Import contacts from the Clients page
          </Text>
        </View>
      ) : (
        <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <FlatList
            data={contacts}
            renderItem={renderContact}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </Animated.View>
      )}
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
    batchButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 6,
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
      borderRadius: 8,
      marginBottom: 8,
      gap: 12,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      alignItems: "center",
      justifyContent: "center",
    },
    checkmark: {
      color: "#fff",
      fontSize: 14,
      fontWeight: "700",
    },
    contactInfo: {
      flex: 1,
    },
    contactName: {
      fontSize: 16,
      fontWeight: "600",
      marginBottom: 2,
    },
    contactDetail: {
      fontSize: 13,
    },
    syncStatus: {
      alignItems: "flex-end",
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
