"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/ThemeContext";
import { useReceipts } from "../../hooks/useReceipts";
import { Receipt } from "../../types/billing";
import ReceiptDetailsModal from "../billing/ReceiptDetailsModal";
import ReceiptModal from "../billing/ReceiptModal";
import EmailStatusBadge from "../billing/EmailStatusBadge";

export default function BillingScreen() {
  const { tokens } = useTheme();
  const { receipts, loading, error, refetch } = useReceipts();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingReceiptId, setEditingReceiptId] = useState<string | null>(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Animate list when receipts load
  useEffect(() => {
    if (!loading && receipts.length > 0) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [loading, receipts, fadeAnim]);

  // Filter receipts based on search and status
  const filteredReceipts = receipts.filter(receipt => {
    const matchesSearch = receipt.client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         receipt.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || receipt.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerSection}>
          <View>
            <Text style={[styles.headerTitle, { color: tokens.textPrimary }]}>
              Billing & Receipts
            </Text>
            <Text style={[styles.headerSubtitle, { color: tokens.textSecondary }]}>
              Manage receipts, invoices, and billing documents
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.createIconButton, { backgroundColor: tokens.accent }]}
            onPress={() => setShowCreateModal(true)}
          >
            <Text style={{ fontSize: 24, color: tokens.background }}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Search and Filters */}
        <View style={[styles.filtersSection, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
          {/* Search Field */}
          <View style={[styles.searchContainer, { backgroundColor: tokens.background, borderColor: tokens.border }]}>
            <Ionicons name="search" size={18} color={tokens.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: tokens.textPrimary }]}
              placeholder="Search receipts..."
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

          {/* Status Filter */}
          <View style={styles.filterGroup}>
            <Text style={[styles.filterLabel, { color: tokens.textSecondary }]}>Status</Text>
            <View style={styles.filterButtons}>
              {['all', 'draft', 'sent', 'paid'].map((status) => (
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
        </View>

        {/* Receipts List */}
        <View style={[styles.receiptsSection, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: tokens.textPrimary }]}>
              Receipts ({filteredReceipts.length})
            </Text>
            <TouchableOpacity onPress={refetch}>
              <Ionicons name="refresh" size={18} color={tokens.accent} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={tokens.accent} />
              <Text style={[styles.loadingText, { color: tokens.textSecondary }]}>Loading receipts...</Text>
            </View>
          ) : error ? (
            <View style={styles.centerContainer}>
              <Ionicons name="alert-circle" size={32} color={tokens.textSecondary} />
              <Text style={[styles.errorText, { color: tokens.textSecondary }]}>{error}</Text>
              <TouchableOpacity
                style={[styles.retryButton, { backgroundColor: tokens.accent }]}
                onPress={refetch}
              >
                <Text style={[styles.retryButtonText, { color: tokens.background }]}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : filteredReceipts.length === 0 ? (
            <View style={styles.centerContainer}>
              <Ionicons name="document-text-outline" size={32} color={tokens.textSecondary} />
              <Text style={[styles.emptyText, { color: tokens.textSecondary }]}>
                {searchQuery || statusFilter !== "all" ? "No receipts match your filters" : "No receipts yet"}
              </Text>
            </View>
          ) : (
            <Animated.View style={[styles.receiptsList, { opacity: fadeAnim }]}>
              {filteredReceipts.map(receipt => (
                <TouchableOpacity
                  key={receipt.id}
                  style={[styles.receiptCard, { backgroundColor: tokens.background, borderColor: tokens.border }]}
                  onPress={() => setSelectedReceiptId(receipt.id)}
                >
                  <View style={styles.receiptHeader}>
                    <View>
                      <Text style={[styles.receiptNumber, { color: tokens.textPrimary }]}>
                        {receipt.receiptNumber}
                      </Text>
                      <Text style={[styles.receiptClient, { color: tokens.textSecondary }]}>
                        {receipt.client.name}
                      </Text>
                    </View>
                    <View style={styles.receiptMetaRight}>
                      <Text style={[styles.receiptAmount, { color: tokens.accent }]}>
                        {formatCurrency(receipt.totalAmount)}
                      </Text>
                      <Text style={[styles.receiptDate, { color: tokens.textSecondary }]}>
                        {formatDate(receipt.serviceDate)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.receiptFooter}>
                    <View style={[
                      styles.statusPill,
                      {
                        backgroundColor: receipt.status === 'paid' ? '#E8F5E9' : receipt.status === 'sent' ? '#E3F2FD' : '#FFF3E0',
                        borderColor: receipt.status === 'paid' ? '#4CAF50' : receipt.status === 'sent' ? '#2196F3' : '#FF9800'
                      }
                    ]}>
                      <Text style={[
                        styles.statusPillText,
                        { color: receipt.status === 'paid' ? '#4CAF50' : receipt.status === 'sent' ? '#2196F3' : '#FF9800' }
                      ]}>
                        {receipt.status.toUpperCase()}
                      </Text>
                    </View>
                    {receipt.emailStatus && <EmailStatusBadge status={receipt.emailStatus} />}
                  </View>
                </TouchableOpacity>
              ))}
            </Animated.View>
          )}
        </View>
      </ScrollView>

      {/* Receipt Details Modal */}
      <ReceiptDetailsModal
        isOpen={!!selectedReceiptId}
        onClose={() => setSelectedReceiptId(null)}
        receiptId={selectedReceiptId}
        onReceiptUpdated={(receipt) => {
          refetch();
        }}
        onEditPress={(receiptId) => {
          setEditingReceiptId(receiptId);
          setSelectedReceiptId(null);
        }}
      />

      {/* Receipt Creation/Edit Modal */}
      <ReceiptModal
        isOpen={showCreateModal || !!editingReceiptId}
        onClose={() => {
          setShowCreateModal(false);
          setEditingReceiptId(null);
        }}
        onReceiptCreated={(receipt) => {
          refetch();
          setShowCreateModal(false);
          setEditingReceiptId(null);
        }}
        receiptId={editingReceiptId || undefined}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  headerSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    fontFamily: "Bytesized-Regular",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: "lores-9-wide",
  },
  createIconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
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
  filterGroup: {
    marginBottom: 4,
  },
  filterLabel: {
    fontSize: 12,
    fontFamily: "lores-9-wide",
    fontWeight: "600",
    marginBottom: 8,
    textTransform: "uppercase",
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
    fontFamily: "lores-9-wide",
    fontWeight: "600",
  },
  receiptsSection: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Bytesized-Regular",
    fontWeight: "700",
  },
  centerContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    fontFamily: "lores-9-wide",
  },
  errorText: {
    marginTop: 12,
    fontSize: 13,
    fontFamily: "lores-9-wide",
    textAlign: "center",
  },
  emptyText: {
    marginTop: 12,
    fontSize: 13,
    fontFamily: "lores-9-wide",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 13,
    fontFamily: "lores-9-wide",
    fontWeight: "700",
  },
  receiptsList: {
    gap: 12,
  },
  receiptCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  receiptHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  receiptNumber: {
    fontSize: 15,
    fontFamily: "lores-9-wide",
    fontWeight: "700",
    marginBottom: 4,
  },
  receiptClient: {
    fontSize: 13,
    fontFamily: "lores-9-wide",
  },
  receiptMetaRight: {
    alignItems: "flex-end",
  },
  receiptAmount: {
    fontSize: 16,
    fontFamily: "Bytesized-Regular",
    fontWeight: "700",
    marginBottom: 2,
  },
  receiptDate: {
    fontSize: 11,
    fontFamily: "lores-9-wide",
  },
  receiptFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 10,
    fontFamily: "lores-9-wide",
    fontWeight: "700",
  },
});
