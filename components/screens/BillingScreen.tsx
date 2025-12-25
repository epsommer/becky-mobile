"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/ThemeContext";
import { useReceipts } from "../../hooks/useReceipts";
import { useInvoices } from "../../hooks/useInvoices";
import { useBatchOperations } from "../../hooks/useBatchOperations";
import { Receipt, Invoice, isInvoiceOverdue } from "../../types/billing";
import { SelectionProvider, useSelection, SelectableItem, BatchActionBar } from "../selection";
import ReceiptDetailsModal from "../billing/ReceiptDetailsModal";
import ReceiptModal from "../billing/ReceiptModal";
import InvoiceModal from "../modals/InvoiceModal";
import InvoiceDetailsModal from "../modals/InvoiceDetailsModal";
import TimeTrackerModal from "../modals/TimeTrackerModal";
import EmailStatusBadge from "../billing/EmailStatusBadge";
import { ExportButton, ExportFormat } from "../ExportButton";
import { useExport } from "../../services/export";

type TabType = "receipts" | "invoices";
type CreateModalType = "receipt" | "invoice" | null;

/**
 * Inner component that uses selection context
 */
function BillingListContent({
  activeTab,
  filteredReceipts,
  filteredInvoices,
  loading,
  error,
  searchQuery,
  statusFilter,
  onRefresh,
  onSelectReceipt,
  onSelectInvoice,
  onCreateReceipt,
  onCreateInvoice,
  fadeAnim,
}: {
  activeTab: TabType;
  filteredReceipts: Receipt[];
  filteredInvoices: Invoice[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  statusFilter: string;
  onRefresh: () => void;
  onSelectReceipt: (id: string) => void;
  onSelectInvoice: (id: string) => void;
  onCreateReceipt: () => void;
  onCreateInvoice: () => void;
  fadeAnim: Animated.Value;
}) {
  const { tokens } = useTheme();
  const { isSelectionMode, enterSelectionMode } = useSelection();

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

  const getStatusColors = (status: string, overdue: boolean = false) => {
    if (overdue && status !== 'paid') {
      return {
        background: '#FFEBEE',
        border: '#F44336',
        text: '#F44336'
      };
    }

    switch (status) {
      case 'paid':
        return {
          background: '#E8F5E9',
          border: '#4CAF50',
          text: '#4CAF50'
        };
      case 'sent':
        return {
          background: '#E3F2FD',
          border: '#2196F3',
          text: '#2196F3'
        };
      case 'draft':
      default:
        return {
          background: '#FFF3E0',
          border: '#FF9800',
          text: '#FF9800'
        };
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={tokens.accent} />
        <Text style={[styles.loadingText, { color: tokens.textSecondary }]}>
          Loading {activeTab}...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={32} color={tokens.textSecondary} />
        <Text style={[styles.errorText, { color: tokens.textSecondary }]}>{error}</Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: tokens.accent }]}
          onPress={onRefresh}
        >
          <Text style={[styles.retryButtonText, { color: tokens.background }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (activeTab === "receipts") {
    if (filteredReceipts.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <Ionicons name="receipt-outline" size={32} color={tokens.textSecondary} />
          <Text style={[styles.emptyText, { color: tokens.textSecondary }]}>
            {searchQuery || statusFilter !== "all" ? "No receipts match your filters" : "No receipts yet"}
          </Text>
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: tokens.accent }]}
            onPress={onCreateReceipt}
          >
            <Text style={[styles.createButtonText, { color: tokens.background }]}>
              Create Receipt
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <Animated.View style={[styles.documentsList, { opacity: fadeAnim }]}>
        {filteredReceipts.map(receipt => {
          const statusColors = getStatusColors(receipt.status);
          return (
            <SelectableItem
              key={receipt.id}
              id={receipt.id}
              onPress={() => onSelectReceipt(receipt.id)}
              style={[styles.documentCard, { backgroundColor: tokens.background, borderColor: tokens.border }]}
            >
              <View style={styles.documentContent}>
                <View style={styles.documentHeader}>
                  <View>
                    <Text style={[styles.documentNumber, { color: tokens.textPrimary }]}>
                      {receipt.receiptNumber}
                    </Text>
                    <Text style={[styles.documentClient, { color: tokens.textSecondary }]}>
                      {receipt.client.name}
                    </Text>
                  </View>
                  <View style={styles.documentMetaRight}>
                    <Text style={[styles.documentAmount, { color: tokens.accent }]}>
                      {formatCurrency(receipt.totalAmount)}
                    </Text>
                    <Text style={[styles.documentDate, { color: tokens.textSecondary }]}>
                      {formatDate(receipt.serviceDate)}
                    </Text>
                  </View>
                </View>

                <View style={styles.documentFooter}>
                  <View style={[
                    styles.statusPill,
                    { backgroundColor: statusColors.background, borderColor: statusColors.border }
                  ]}>
                    <Text style={[styles.statusPillText, { color: statusColors.text }]}>
                      {receipt.status.toUpperCase()}
                    </Text>
                  </View>
                  {receipt.emailStatus && <EmailStatusBadge status={receipt.emailStatus} />}
                </View>
              </View>
            </SelectableItem>
          );
        })}
      </Animated.View>
    );
  }

  // Invoices list
  if (filteredInvoices.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="document-text-outline" size={32} color={tokens.textSecondary} />
        <Text style={[styles.emptyText, { color: tokens.textSecondary }]}>
          {searchQuery || statusFilter !== "all" ? "No invoices match your filters" : "No invoices yet"}
        </Text>
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: tokens.accent }]}
          onPress={onCreateInvoice}
        >
          <Text style={[styles.createButtonText, { color: tokens.background }]}>
            Create Invoice
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.documentsList, { opacity: fadeAnim }]}>
      {filteredInvoices.map(invoice => {
        const overdue = isInvoiceOverdue(invoice);
        const statusColors = getStatusColors(invoice.status, overdue);
        return (
          <SelectableItem
            key={invoice.id}
            id={invoice.id}
            onPress={() => onSelectInvoice(invoice.id)}
            style={[styles.documentCard, { backgroundColor: tokens.background, borderColor: tokens.border }]}
          >
            <View style={styles.documentContent}>
              <View style={styles.documentHeader}>
                <View>
                  <Text style={[styles.documentNumber, { color: tokens.textPrimary }]}>
                    {invoice.invoiceNumber}
                  </Text>
                  <Text style={[styles.documentClient, { color: tokens.textSecondary }]}>
                    {invoice.client.name}
                  </Text>
                </View>
                <View style={styles.documentMetaRight}>
                  <Text style={[styles.documentAmount, { color: tokens.accent }]}>
                    {formatCurrency(invoice.totalAmount)}
                  </Text>
                  <Text style={[styles.documentDate, { color: overdue && invoice.status !== 'paid' ? '#F44336' : tokens.textSecondary }]}>
                    Due: {formatDate(invoice.dueDate)}
                  </Text>
                </View>
              </View>

              <View style={styles.documentFooter}>
                <View style={[
                  styles.statusPill,
                  { backgroundColor: statusColors.background, borderColor: statusColors.border }
                ]}>
                  <Text style={[styles.statusPillText, { color: statusColors.text }]}>
                    {overdue && invoice.status !== 'paid' ? 'OVERDUE' : invoice.status.toUpperCase()}
                  </Text>
                </View>
                {invoice.emailStatus && <EmailStatusBadge status={invoice.emailStatus} />}
              </View>
            </View>
          </SelectableItem>
        );
      })}
    </Animated.View>
  );
}

/**
 * Batch action bar wrapper that uses the selection context
 */
function BillingBatchActionBar({
  activeTab,
  availableIds,
  onSuccess,
}: {
  activeTab: TabType;
  availableIds: string[];
  onSuccess: () => void;
}) {
  const {
    batchDelete,
    batchSend,
    batchMarkPaid,
    batchArchive,
    loading,
    loadingAction,
  } = useBatchOperations(activeTab, {
    onSuccess: () => {
      onSuccess();
    },
    onError: (error) => {
      console.error('[BillingScreen] Batch operation error:', error);
    },
  });

  return (
    <BatchActionBar
      availableIds={availableIds}
      onBatchDelete={batchDelete}
      onBatchSend={batchSend}
      onBatchMarkPaid={batchMarkPaid}
      onBatchArchive={batchArchive}
      loading={loading}
      loadingAction={loadingAction}
    />
  );
}

/**
 * Header with selection mode toggle and export
 */
function BillingHeader({
  activeTab,
  isSelectionMode,
  onEnterSelectionMode,
  onExitSelectionMode,
  onOpenTimer,
  onCreateDocument,
  onExport,
  exportLoading,
}: {
  activeTab: TabType;
  isSelectionMode: boolean;
  onEnterSelectionMode: () => void;
  onExitSelectionMode: () => void;
  onOpenTimer: () => void;
  onCreateDocument: () => void;
  onExport: (format: ExportFormat) => Promise<void>;
  exportLoading: boolean;
}) {
  const { tokens } = useTheme();

  return (
    <View style={styles.headerSection}>
      <View>
        <Text style={[styles.headerTitle, { color: tokens.textPrimary }]}>
          Billing
        </Text>
        <Text style={[styles.headerSubtitle, { color: tokens.textSecondary }]}>
          {isSelectionMode ? 'Select items for batch operations' : 'Manage receipts, invoices, and billing documents'}
        </Text>
      </View>
      <View style={styles.headerActions}>
        {/* Export button */}
        {!isSelectionMode && (
          <ExportButton
            variant="icon"
            formats={['csv']}
            onExport={onExport}
            loading={exportLoading}
            showFormatSelector={false}
            icon="download-outline"
          />
        )}
        {/* Selection mode toggle */}
        <TouchableOpacity
          style={[styles.iconButton, { backgroundColor: isSelectionMode ? tokens.accent : tokens.surface, borderColor: tokens.border }]}
          onPress={isSelectionMode ? onExitSelectionMode : onEnterSelectionMode}
        >
          <Ionicons
            name={isSelectionMode ? "close" : "checkbox-outline"}
            size={20}
            color={isSelectionMode ? tokens.background : tokens.textSecondary}
          />
        </TouchableOpacity>
        {!isSelectionMode && (
          <>
            <TouchableOpacity
              style={[styles.timerIconButton, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
              onPress={onOpenTimer}
            >
              <Ionicons name="timer-outline" size={22} color={tokens.accent} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.createIconButton, { backgroundColor: tokens.accent }]}
              onPress={onCreateDocument}
            >
              <Text style={{ fontSize: 24, color: tokens.background }}>+</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

/**
 * Inner billing screen content with selection context
 */
function BillingScreenInner({
  activeTab,
  setActiveTab,
  receipts,
  invoices,
  filteredReceipts,
  filteredInvoices,
  loadingReceipts,
  loadingInvoices,
  receiptError,
  invoiceError,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  refetchReceipts,
  refetchInvoices,
  onSelectReceipt,
  onSelectInvoice,
  onCreateReceipt,
  onCreateInvoice,
  onOpenTimer,
  onExport,
  exportLoading,
  fadeAnim,
}: {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  receipts: Receipt[];
  invoices: Invoice[];
  filteredReceipts: Receipt[];
  filteredInvoices: Invoice[];
  loadingReceipts: boolean;
  loadingInvoices: boolean;
  receiptError: string | null;
  invoiceError: string | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  refetchReceipts: () => void;
  refetchInvoices: () => void;
  onSelectReceipt: (id: string) => void;
  onSelectInvoice: (id: string) => void;
  onCreateReceipt: () => void;
  onCreateInvoice: () => void;
  onOpenTimer: () => void;
  onExport: (format: ExportFormat) => Promise<void>;
  exportLoading: boolean;
  fadeAnim: Animated.Value;
}) {
  const { tokens } = useTheme();
  const { isSelectionMode, enterSelectionMode, exitSelectionMode } = useSelection();

  const loading = activeTab === "receipts" ? loadingReceipts : loadingInvoices;
  const error = activeTab === "receipts" ? receiptError : invoiceError;

  const handleRefresh = () => {
    if (activeTab === "receipts") {
      refetchReceipts();
    } else {
      refetchInvoices();
    }
  };

  const handleSuccess = () => {
    exitSelectionMode();
    handleRefresh();
  };

  // Get available IDs for current tab
  const availableIds = useMemo(() => {
    return activeTab === "receipts"
      ? filteredReceipts.map(r => r.id)
      : filteredInvoices.map(i => i.id);
  }, [activeTab, filteredReceipts, filteredInvoices]);

  return (
    <View style={styles.screenContainer}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <BillingHeader
          activeTab={activeTab}
          isSelectionMode={isSelectionMode}
          onEnterSelectionMode={enterSelectionMode}
          onExitSelectionMode={exitSelectionMode}
          onOpenTimer={onOpenTimer}
          onCreateDocument={activeTab === "receipts" ? onCreateReceipt : onCreateInvoice}
          onExport={onExport}
          exportLoading={exportLoading}
        />

        {/* Tab Selector */}
        <View style={[styles.tabContainer, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === "receipts" && { backgroundColor: tokens.accent }
            ]}
            onPress={() => {
              if (!isSelectionMode) setActiveTab("receipts");
            }}
            disabled={isSelectionMode}
          >
            <Ionicons
              name="receipt-outline"
              size={18}
              color={activeTab === "receipts" ? tokens.background : tokens.textSecondary}
            />
            <Text style={[
              styles.tabText,
              { color: activeTab === "receipts" ? tokens.background : tokens.textPrimary }
            ]}>
              Receipts
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === "invoices" && { backgroundColor: tokens.accent }
            ]}
            onPress={() => {
              if (!isSelectionMode) setActiveTab("invoices");
            }}
            disabled={isSelectionMode}
          >
            <Ionicons
              name="document-text-outline"
              size={18}
              color={activeTab === "invoices" ? tokens.background : tokens.textSecondary}
            />
            <Text style={[
              styles.tabText,
              { color: activeTab === "invoices" ? tokens.background : tokens.textPrimary }
            ]}>
              Invoices
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search and Filters - hide in selection mode */}
        {!isSelectionMode && (
          <View style={[styles.filtersSection, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
            {/* Search Field */}
            <View style={[styles.searchContainer, { backgroundColor: tokens.background, borderColor: tokens.border }]}>
              <Ionicons name="search" size={18} color={tokens.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: tokens.textPrimary }]}
                placeholder={`Search ${activeTab}...`}
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
                {activeTab === "receipts" ? (
                  // Receipt filters
                  ['all', 'draft', 'sent', 'paid'].map((status) => (
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
                  ))
                ) : (
                  // Invoice filters
                  ['all', 'draft', 'sent', 'paid', 'overdue'].map((status) => (
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
                  ))
                )}
              </View>
            </View>
          </View>
        )}

        {/* Documents List */}
        <View style={[styles.documentsSection, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: tokens.textPrimary }]}>
              {activeTab === "receipts"
                ? `Receipts (${filteredReceipts.length})`
                : `Invoices (${filteredInvoices.length})`
              }
            </Text>
            {!isSelectionMode && (
              <TouchableOpacity onPress={handleRefresh}>
                <Ionicons name="refresh" size={18} color={tokens.accent} />
              </TouchableOpacity>
            )}
          </View>

          {/* Hint for selection mode */}
          {isSelectionMode && (
            <View style={[styles.selectionHint, { backgroundColor: tokens.background, borderColor: tokens.border }]}>
              <Ionicons name="information-circle-outline" size={18} color={tokens.textSecondary} />
              <Text style={[styles.selectionHintText, { color: tokens.textSecondary }]}>
                Long-press an item or tap checkboxes to select. Use the action bar below to perform batch operations.
              </Text>
            </View>
          )}

          <BillingListContent
            activeTab={activeTab}
            filteredReceipts={filteredReceipts}
            filteredInvoices={filteredInvoices}
            loading={loading}
            error={error}
            searchQuery={searchQuery}
            statusFilter={statusFilter}
            onRefresh={handleRefresh}
            onSelectReceipt={onSelectReceipt}
            onSelectInvoice={onSelectInvoice}
            onCreateReceipt={onCreateReceipt}
            onCreateInvoice={onCreateInvoice}
            fadeAnim={fadeAnim}
          />
        </View>

        {/* Spacer for batch action bar */}
        {isSelectionMode && <View style={styles.batchBarSpacer} />}
      </ScrollView>

      {/* Batch Action Bar */}
      <BillingBatchActionBar
        activeTab={activeTab}
        availableIds={availableIds}
        onSuccess={handleSuccess}
      />
    </View>
  );
}

export default function BillingScreen() {
  const { tokens } = useTheme();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>("receipts");

  // Receipt state
  const { receipts, loading: loadingReceipts, error: receiptError, refetch: refetchReceipts } = useReceipts();
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
  const [editingReceiptId, setEditingReceiptId] = useState<string | null>(null);

  // Invoice state
  const { invoices, loading: loadingInvoices, error: invoiceError, refetch: refetchInvoices } = useInvoices();
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);

  // Shared state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreateModal, setShowCreateModal] = useState<CreateModalType>(null);
  const [showTimeTracker, setShowTimeTracker] = useState(false);

  // Export functionality
  const { exporting, exportReceiptsCSV, exportInvoicesCSV } = useExport();

  const handleExport = async (format: ExportFormat) => {
    if (activeTab === "receipts") {
      const dataToExport = filteredReceipts.length > 0 ? filteredReceipts : receipts;
      if (dataToExport.length === 0) {
        Alert.alert('No Data', 'No receipts to export.');
        return;
      }
      await exportReceiptsCSV(dataToExport);
    } else {
      const dataToExport = filteredInvoices.length > 0 ? filteredInvoices : invoices;
      if (dataToExport.length === 0) {
        Alert.alert('No Data', 'No invoices to export.');
        return;
      }
      await exportInvoicesCSV(dataToExport);
    }
  };

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Animate list when data loads
  useEffect(() => {
    const dataLoaded = activeTab === "receipts"
      ? !loadingReceipts && receipts.length > 0
      : !loadingInvoices && invoices.length > 0;

    if (dataLoaded) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [loadingReceipts, loadingInvoices, receipts, invoices, activeTab, fadeAnim]);

  // Reset filter when tab changes
  useEffect(() => {
    setStatusFilter("all");
    setSearchQuery("");
    fadeAnim.setValue(0);
  }, [activeTab]);

  // Filter receipts based on search and status
  const filteredReceipts = receipts.filter(receipt => {
    const matchesSearch = receipt.client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         receipt.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || receipt.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Filter invoices based on search and status
  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase());

    // Handle overdue filter
    if (statusFilter === "overdue") {
      return matchesSearch && isInvoiceOverdue(invoice);
    }

    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <>
      <SelectionProvider entityType={activeTab} key={activeTab}>
        <BillingScreenInner
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          receipts={receipts}
          invoices={invoices}
          filteredReceipts={filteredReceipts}
          filteredInvoices={filteredInvoices}
          loadingReceipts={loadingReceipts}
          loadingInvoices={loadingInvoices}
          receiptError={receiptError}
          invoiceError={invoiceError}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          refetchReceipts={refetchReceipts}
          refetchInvoices={refetchInvoices}
          onSelectReceipt={setSelectedReceiptId}
          onSelectInvoice={setSelectedInvoiceId}
          onCreateReceipt={() => setShowCreateModal("receipt")}
          onCreateInvoice={() => setShowCreateModal("invoice")}
          onOpenTimer={() => setShowTimeTracker(true)}
          onExport={handleExport}
          exportLoading={exporting}
          fadeAnim={fadeAnim}
        />
      </SelectionProvider>

      {/* Receipt Modals */}
      <ReceiptDetailsModal
        isOpen={!!selectedReceiptId}
        onClose={() => setSelectedReceiptId(null)}
        receiptId={selectedReceiptId}
        onReceiptUpdated={() => {
          refetchReceipts();
        }}
        onEditPress={(receiptId) => {
          setEditingReceiptId(receiptId);
          setSelectedReceiptId(null);
        }}
      />

      <ReceiptModal
        isOpen={showCreateModal === "receipt" || !!editingReceiptId}
        onClose={() => {
          setShowCreateModal(null);
          setEditingReceiptId(null);
        }}
        onReceiptCreated={() => {
          refetchReceipts();
          setShowCreateModal(null);
          setEditingReceiptId(null);
        }}
        receiptId={editingReceiptId || undefined}
      />

      {/* Invoice Modals */}
      <InvoiceDetailsModal
        isOpen={!!selectedInvoiceId}
        onClose={() => setSelectedInvoiceId(null)}
        invoiceId={selectedInvoiceId}
        onInvoiceUpdated={() => {
          refetchInvoices();
        }}
        onEditPress={(invoiceId) => {
          setEditingInvoiceId(invoiceId);
          setSelectedInvoiceId(null);
        }}
      />

      <InvoiceModal
        isOpen={showCreateModal === "invoice" || !!editingInvoiceId}
        onClose={() => {
          setShowCreateModal(null);
          setEditingInvoiceId(null);
        }}
        onInvoiceCreated={() => {
          refetchInvoices();
          setShowCreateModal(null);
          setEditingInvoiceId(null);
        }}
        invoiceId={editingInvoiceId || undefined}
      />

      {/* Time Tracker Modal */}
      <TimeTrackerModal
        isOpen={showTimeTracker}
        onClose={() => setShowTimeTracker(false)}
        onTimeEntryCreated={() => {
          console.log('[BillingScreen] Time entry created');
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
  },
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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  timerIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  createIconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  tabContainer: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabText: {
    fontSize: 14,
    fontFamily: "lores-9-wide",
    fontWeight: "700",
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
    fontSize: 12,
    fontFamily: "lores-9-wide",
    fontWeight: "600",
  },
  documentsSection: {
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
  selectionHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  selectionHintText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
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
  createButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  createButtonText: {
    fontSize: 13,
    fontFamily: "lores-9-wide",
    fontWeight: "700",
  },
  documentsList: {
    gap: 12,
  },
  documentCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  documentContent: {
    flex: 1,
  },
  documentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  documentNumber: {
    fontSize: 15,
    fontFamily: "lores-9-wide",
    fontWeight: "700",
    marginBottom: 4,
  },
  documentClient: {
    fontSize: 13,
    fontFamily: "lores-9-wide",
  },
  documentMetaRight: {
    alignItems: "flex-end",
  },
  documentAmount: {
    fontSize: 16,
    fontFamily: "Bytesized-Regular",
    fontWeight: "700",
    marginBottom: 2,
  },
  documentDate: {
    fontSize: 11,
    fontFamily: "lores-9-wide",
  },
  documentFooter: {
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
  batchBarSpacer: {
    height: 120,
  },
});
