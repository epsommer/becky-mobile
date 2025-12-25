"use client";

import React, { useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/ThemeContext";
import {
  Invoice,
  InvoiceItem,
  DEFAULT_TAX_CONFIG,
  getPaymentTermsLabel,
  isInvoiceOverdue,
} from "../../types/billing";
import { useInvoice, useInvoiceMutations } from "../../hooks/useInvoices";
import EmailStatusBadge from "../billing/EmailStatusBadge";

interface InvoiceDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: string | null;
  onInvoiceUpdated?: (invoice: Invoice) => void;
  onEditPress?: (invoiceId: string) => void;
}

export default function InvoiceDetailsModal({
  isOpen,
  onClose,
  invoiceId,
  onInvoiceUpdated,
  onEditPress,
}: InvoiceDetailsModalProps) {
  const { tokens } = useTheme();
  const { invoice, loading, error, refetch } = useInvoice(invoiceId);
  const { sendInvoice, markAsPaid, duplicateInvoice, deleteInvoice } = useInvoiceMutations();
  const [sending, setSending] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSendEmail = async () => {
    if (!invoice || !invoice.client.email) {
      Alert.alert('Error', 'Client has no email address');
      return;
    }

    Alert.alert(
      'Send Invoice',
      `Send invoice ${invoice.invoiceNumber} to ${invoice.client.email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            try {
              setSending(true);
              const success = await sendInvoice(invoice.id, invoice.client.email);

              if (success) {
                Alert.alert('Success', `Invoice sent to ${invoice.client.email}`);
                await refetch();
                if (onInvoiceUpdated && invoice) {
                  onInvoiceUpdated(invoice);
                }
              } else {
                Alert.alert('Error', 'Failed to send invoice');
              }
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to send invoice');
            } finally {
              setSending(false);
            }
          },
        },
      ]
    );
  };

  const handleMarkAsPaid = async () => {
    if (!invoice) return;

    Alert.alert(
      'Mark as Paid',
      `Mark invoice ${invoice.invoiceNumber} as paid?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Paid',
          onPress: async () => {
            try {
              setMarkingPaid(true);
              const updatedInvoice = await markAsPaid(invoice.id);

              if (updatedInvoice) {
                Alert.alert('Success', `Invoice ${invoice.invoiceNumber} marked as paid`);
                await refetch();
                if (onInvoiceUpdated) {
                  onInvoiceUpdated(updatedInvoice);
                }
              } else {
                Alert.alert('Error', 'Failed to mark invoice as paid');
              }
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to mark as paid');
            } finally {
              setMarkingPaid(false);
            }
          },
        },
      ]
    );
  };

  const handleDuplicate = async () => {
    if (!invoice) return;

    Alert.alert(
      'Duplicate Invoice',
      `Create a new draft invoice based on ${invoice.invoiceNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Duplicate',
          onPress: async () => {
            try {
              setDuplicating(true);
              const newInvoice = await duplicateInvoice(invoice.id);

              if (newInvoice) {
                Alert.alert('Success', `New invoice ${(newInvoice as any).invoiceNumber} created`);
                if (onInvoiceUpdated) {
                  onInvoiceUpdated(newInvoice);
                }
                onClose();
              } else {
                Alert.alert('Error', 'Failed to duplicate invoice');
              }
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to duplicate');
            } finally {
              setDuplicating(false);
            }
          },
        },
      ]
    );
  };

  const handleDelete = async () => {
    if (!invoice) return;

    Alert.alert(
      'Delete Invoice',
      `Are you sure you want to delete invoice ${invoice.invoiceNumber}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              const success = await deleteInvoice(invoice.id);

              if (success) {
                Alert.alert('Success', 'Invoice deleted');
                onClose();
              } else {
                Alert.alert('Error', 'Failed to delete invoice');
              }
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleShareInvoice = async () => {
    if (!invoice) return;

    try {
      const message = `Invoice ${invoice.invoiceNumber}\n\nClient: ${invoice.client.name}\nAmount Due: $${invoice.totalAmount.toFixed(2)}\nDue Date: ${formatDate(invoice.dueDate)}\nPayment Terms: ${getPaymentTermsLabel(invoice.paymentTerms)}`;

      await Share.share({
        message,
        title: `Invoice ${invoice.invoiceNumber}`,
      });
    } catch (error) {
      console.error('[InvoiceDetailsModal] Error sharing invoice:', error);
      Alert.alert('Error', 'Failed to share invoice');
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColors = (status: string, overdue: boolean) => {
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

  // Calculate totals
  const calculateTotals = (items: InvoiceItem[]) => {
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const taxableAmount = items
      .filter(item => item.taxable)
      .reduce((sum, item) => sum + item.totalPrice, 0);
    const tax = taxableAmount * DEFAULT_TAX_CONFIG.rate;
    const total = subtotal + tax;
    return { subtotal, tax, total, hasAnyTaxableItems: taxableAmount > 0 };
  };

  if (!isOpen) return null;

  const invoiceOverdue = invoice ? isInvoiceOverdue(invoice) : false;
  const statusColors = invoice ? getStatusColors(invoice.status, invoiceOverdue) : getStatusColors('draft', false);

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.safeArea, { backgroundColor: tokens.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: tokens.surface, borderBottomColor: tokens.border }]}>
          <Text style={[styles.headerTitle, { color: tokens.textPrimary }]}>Invoice Details</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={tokens.textPrimary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={tokens.accent} />
            <Text style={[styles.loadingText, { color: tokens.textSecondary }]}>Loading invoice...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Ionicons name="alert-circle" size={48} color={tokens.textSecondary} />
            <Text style={[styles.errorText, { color: tokens.textSecondary }]}>{error}</Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: tokens.accent }]}
              onPress={refetch}
            >
              <Text style={[styles.retryButtonText, { color: tokens.background }]}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : invoice ? (
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
            {/* Invoice Number & Status */}
            <View style={[styles.invoiceHeader, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
              <View>
                <Text style={[styles.invoiceLabel, { color: tokens.textSecondary }]}>Invoice Number</Text>
                <Text style={[styles.invoiceNumber, { color: tokens.textPrimary }]}>{invoice.invoiceNumber}</Text>
              </View>
              <View style={styles.statusContainer}>
                <View style={[
                  styles.statusBadge,
                  {
                    backgroundColor: statusColors.background,
                    borderColor: statusColors.border
                  }
                ]}>
                  <Text style={[styles.statusText, { color: statusColors.text }]}>
                    {invoiceOverdue && invoice.status !== 'paid' ? 'OVERDUE' : invoice.status.toUpperCase()}
                  </Text>
                </View>
                {invoice.emailStatus && <EmailStatusBadge status={invoice.emailStatus} />}
              </View>
            </View>

            {/* Client Information */}
            <View style={[styles.section, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
              <Text style={[styles.sectionTitle, { color: tokens.textPrimary }]}>Client Information</Text>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: tokens.textSecondary }]}>Name</Text>
                <Text style={[styles.infoValue, { color: tokens.textPrimary }]}>{invoice.client.name}</Text>
              </View>
              {invoice.client.email && (
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: tokens.textSecondary }]}>Email</Text>
                  <Text style={[styles.infoValue, { color: tokens.textPrimary }]}>{invoice.client.email}</Text>
                </View>
              )}
              {invoice.client.phone && (
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: tokens.textSecondary }]}>Phone</Text>
                  <Text style={[styles.infoValue, { color: tokens.textPrimary }]}>{invoice.client.phone}</Text>
                </View>
              )}
            </View>

            {/* Invoice Dates & Terms */}
            <View style={[styles.section, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
              <Text style={[styles.sectionTitle, { color: tokens.textPrimary }]}>Invoice Details</Text>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: tokens.textSecondary }]}>Invoice Date</Text>
                <Text style={[styles.infoValue, { color: tokens.textPrimary }]}>
                  {formatDate(invoice.invoiceDate)}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: tokens.textSecondary }]}>Due Date</Text>
                <Text style={[
                  styles.infoValue,
                  { color: invoiceOverdue && invoice.status !== 'paid' ? '#F44336' : tokens.textPrimary }
                ]}>
                  {formatDate(invoice.dueDate)}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: tokens.textSecondary }]}>Payment Terms</Text>
                <Text style={[styles.infoValue, { color: tokens.textPrimary }]}>
                  {getPaymentTermsLabel(invoice.paymentTerms)}
                </Text>
              </View>
              {invoice.paidAt && (
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: tokens.textSecondary }]}>Paid On</Text>
                  <Text style={[styles.infoValue, { color: '#4CAF50' }]}>
                    {formatDate(invoice.paidAt)}
                  </Text>
                </View>
              )}
            </View>

            {/* Service Items */}
            <View style={[styles.section, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
              <Text style={[styles.sectionTitle, { color: tokens.textPrimary }]}>Line Items</Text>
              {invoice.items.map((item, index) => (
                <View
                  key={item.id}
                  style={[
                    styles.itemRow,
                    index < invoice.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: tokens.border }
                  ]}
                >
                  <View style={styles.itemDetails}>
                    <Text style={[styles.itemDescription, { color: tokens.textPrimary }]}>
                      {item.description}
                    </Text>
                    <Text style={[styles.itemMeta, { color: tokens.textSecondary }]}>
                      {item.quantity} {item.billingMode === 'hours' ? 'hrs' : 'qty'} x ${item.unitPrice.toFixed(2)}
                      {item.taxable && ` + ${(DEFAULT_TAX_CONFIG.rate * 100).toFixed(0)}% tax`}
                    </Text>
                  </View>
                  <Text style={[styles.itemTotal, { color: tokens.textPrimary }]}>
                    ${item.totalPrice.toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>

            {/* Invoice Summary */}
            {(() => {
              const { subtotal, tax, total, hasAnyTaxableItems } = calculateTotals(invoice.items);
              return (
                <View style={[styles.section, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: tokens.textSecondary }]}>Subtotal</Text>
                    <Text style={[styles.summaryValue, { color: tokens.textPrimary }]}>${subtotal.toFixed(2)}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: tokens.textSecondary }]}>
                      Tax ({hasAnyTaxableItems ? `${(DEFAULT_TAX_CONFIG.rate * 100).toFixed(0)}%` : 'N/A'})
                    </Text>
                    <Text style={[styles.summaryValue, { color: tokens.textPrimary }]}>
                      {hasAnyTaxableItems ? `$${tax.toFixed(2)}` : 'N/A'}
                    </Text>
                  </View>
                  <View style={[styles.summaryRow, styles.totalRow, { borderTopColor: tokens.border }]}>
                    <Text style={[styles.totalLabel, { color: tokens.textPrimary }]}>Total Amount Due</Text>
                    <Text style={[styles.totalValue, { color: tokens.accent }]}>${total.toFixed(2)}</Text>
                  </View>
                </View>
              );
            })()}

            {/* Notes */}
            {invoice.notes && (
              <View style={[styles.section, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
                <Text style={[styles.sectionTitle, { color: tokens.textPrimary }]}>Notes & Terms</Text>
                <Text style={[styles.notesText, { color: tokens.textSecondary }]}>{invoice.notes}</Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actions}>
              {/* Edit Button */}
              {onEditPress && invoice.status !== 'paid' && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
                  onPress={() => onEditPress(invoice.id)}
                >
                  <Ionicons name="create-outline" size={18} color={tokens.accent} />
                  <Text style={[styles.actionButtonText, { color: tokens.accent }]}>Edit Invoice</Text>
                </TouchableOpacity>
              )}

              {/* Share Button */}
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
                onPress={handleShareInvoice}
              >
                <Ionicons name="share-outline" size={18} color={tokens.accent} />
                <Text style={[styles.actionButtonText, { color: tokens.accent }]}>Share</Text>
              </TouchableOpacity>

              {/* Duplicate Button */}
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
                onPress={handleDuplicate}
                disabled={duplicating}
              >
                {duplicating ? (
                  <ActivityIndicator size="small" color={tokens.accent} />
                ) : (
                  <>
                    <Ionicons name="copy-outline" size={18} color={tokens.accent} />
                    <Text style={[styles.actionButtonText, { color: tokens.accent }]}>Duplicate</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Mark as Paid Button (only for non-paid invoices) */}
              {invoice.status !== 'paid' && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#4CAF50', borderColor: '#4CAF50' }]}
                  onPress={handleMarkAsPaid}
                  disabled={markingPaid}
                >
                  {markingPaid ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                      <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Mark as Paid</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {/* Send/Resend Email Button */}
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: tokens.accent },
                  (!invoice.client.email || sending) && { opacity: 0.5 }
                ]}
                onPress={handleSendEmail}
                disabled={!invoice.client.email || sending}
              >
                {sending ? (
                  <ActivityIndicator size="small" color={tokens.background} />
                ) : (
                  <>
                    <Ionicons name="send" size={18} color={tokens.background} />
                    <Text style={[styles.actionButtonText, { color: tokens.background }]}>
                      {invoice.emailStatus === 'sent' || invoice.emailStatus === 'delivered' ? 'Resend' : 'Send Invoice'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Delete Button (only for drafts) */}
              {invoice.status === 'draft' && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#FFEBEE', borderColor: '#F44336' }]}
                  onPress={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? (
                    <ActivityIndicator size="small" color="#F44336" />
                  ) : (
                    <>
                      <Ionicons name="trash-outline" size={18} color="#F44336" />
                      <Text style={[styles.actionButtonText, { color: '#F44336' }]}>Delete</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Bytesized-Regular",
    fontWeight: "700",
  },
  closeButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    fontFamily: "lores-9-wide",
  },
  errorText: {
    marginTop: 16,
    fontSize: 14,
    fontFamily: "lores-9-wide",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 14,
    fontFamily: "lores-9-wide",
    fontWeight: "700",
  },
  invoiceHeader: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  invoiceLabel: {
    fontSize: 11,
    fontFamily: "lores-9-wide",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  invoiceNumber: {
    fontSize: 20,
    fontFamily: "Bytesized-Regular",
    fontWeight: "700",
  },
  statusContainer: {
    alignItems: "flex-end",
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontFamily: "lores-9-wide",
    fontWeight: "700",
  },
  section: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Bytesized-Regular",
    fontWeight: "700",
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 13,
    fontFamily: "lores-9-wide",
  },
  infoValue: {
    fontSize: 13,
    fontFamily: "lores-9-wide",
    fontWeight: "600",
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 12,
  },
  itemDetails: {
    flex: 1,
    marginRight: 12,
  },
  itemDescription: {
    fontSize: 14,
    fontFamily: "lores-9-wide",
    fontWeight: "600",
    marginBottom: 4,
  },
  itemMeta: {
    fontSize: 12,
    fontFamily: "lores-9-wide",
  },
  itemTotal: {
    fontSize: 14,
    fontFamily: "lores-9-wide",
    fontWeight: "700",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: "lores-9-wide",
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: "lores-9-wide",
    fontWeight: "600",
  },
  totalRow: {
    borderTopWidth: 2,
    paddingTop: 12,
    marginBottom: 0,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontFamily: "Bytesized-Regular",
    fontWeight: "700",
  },
  totalValue: {
    fontSize: 18,
    fontFamily: "Bytesized-Regular",
    fontWeight: "700",
  },
  notesText: {
    fontSize: 14,
    fontFamily: "lores-9-wide",
    lineHeight: 20,
  },
  actions: {
    gap: 12,
    marginTop: 8,
    marginBottom: 32,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 14,
    fontFamily: "lores-9-wide",
    fontWeight: "700",
  },
});
