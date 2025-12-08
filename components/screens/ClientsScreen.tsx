"use client";

import React from "react";
import { ScrollView, StyleSheet, Text, View, TextInput, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/ThemeContext";
import ClientSelectorPanel from "../ClientSelectorPanel";
import ContactImportPanel from "../ContactImportPanel";

interface ClientsScreenProps {
  onViewClientDetail?: (clientId: string) => void;
  onViewContacts?: () => void;
}

export default function ClientsScreen({ onViewClientDetail, onViewContacts }: ClientsScreenProps) {
  const { tokens } = useTheme();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [serviceFilter, setServiceFilter] = React.useState<string>("all");

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.headerSection}>
        <Text style={[styles.headerTitle, { color: tokens.textPrimary }]}>
          Client Management
        </Text>
      </View>

      {/* Contact Import Panel */}
      <ContactImportPanel onViewContacts={onViewContacts} />

      {/* Search and Filters */}
      <View style={[styles.filtersSection, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
        {/* Search Field */}
        <View style={[styles.searchContainer, { backgroundColor: tokens.background, borderColor: tokens.border }]}>
          <Ionicons name="search" size={18} color={tokens.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: tokens.textPrimary }]}
            placeholder="Search clients..."
            placeholderTextColor={tokens.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close" size={16} color={tokens.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Options */}
        <View style={styles.filterRow}>
          <Text style={[styles.filterLabel, { color: tokens.textSecondary }]}>Filter by:</Text>

          {/* Status Filter */}
          <View style={styles.filterGroup}>
            <Text style={[styles.filterSubLabel, { color: tokens.textSecondary }]}>Status</Text>
            <View style={styles.filterButtons}>
              {['all', 'active', 'prospect', 'completed'].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.filterButton,
                    {
                      backgroundColor: statusFilter === status ? tokens.accent : tokens.surface,
                      borderColor: statusFilter === status ? tokens.accent : tokens.border
                    }
                  ]}
                  onPress={() => setStatusFilter(status)}
                >
                  <Text style={[
                    styles.filterButtonText,
                    { color: statusFilter === status ? tokens.background : tokens.textPrimary }
                  ]}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Service Line Filter */}
          <View style={styles.filterGroup}>
            <Text style={[styles.filterSubLabel, { color: tokens.textSecondary }]}>Service Line</Text>
            <View style={styles.filterButtons}>
              {['all', 'landscaping', 'maintenance', 'design'].map((service) => (
                <TouchableOpacity
                  key={service}
                  style={[
                    styles.filterButton,
                    {
                      backgroundColor: serviceFilter === service ? tokens.accent : tokens.surface,
                      borderColor: serviceFilter === service ? tokens.accent : tokens.border
                    }
                  ]}
                  onPress={() => setServiceFilter(service)}
                >
                  <Text style={[
                    styles.filterButtonText,
                    { color: serviceFilter === service ? tokens.background : tokens.textPrimary }
                  ]}>
                    {service.charAt(0).toUpperCase() + service.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </View>

      <ClientSelectorPanel
        variant="all"
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        serviceFilter={serviceFilter}
        onViewClientDetail={onViewClientDetail}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  headerSection: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    fontFamily: "Bytesized-Regular",
  },
  filtersSection: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  filterRow: {
    gap: 12,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  filterGroup: {
    marginBottom: 12,
  },
  filterSubLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
  },
  filterButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
