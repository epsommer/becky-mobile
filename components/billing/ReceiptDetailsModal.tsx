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
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/ThemeContext";
import { Receipt } from "../../types/billing";
import { useReceipt } from "../../hooks/useReceipts";
import ReceiptSummary from "./ReceiptSummary";
import EmailStatusBadge from "./EmailStatusBadge";
import * as billingApi from "../../api/billing";
import { generateReceiptHTML, generateReceiptFilename } from "../../utils/pdfGenerator";

interface ReceiptDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptId: string | null;
  onReceiptUpdated?: (receipt: Receipt) => void;
  onEditPress?: (receiptId: string) => void;
}

export default function ReceiptDetailsModal({
  isOpen,
  onClose,
  receiptId,
  onReceiptUpdated,
  onEditPress,
}: ReceiptDetailsModalProps) {
  const { tokens } = useTheme();
  const { receipt, loading, error, refetch } = useReceipt(receiptId);
  const [sending, setSending] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  const handleSendEmail = async () => {
    if (!receipt || !receipt.client.email) {
      Alert.alert('Error', 'Client has no email address');
      return;
    }

    Alert.alert(
      'Send Receipt',
      `Send receipt ${receipt.receiptNumber} to ${receipt.client.email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            try {
              setSending(true);
              const result = await billingApi.sendReceiptEmail(
                receipt.id,
                receipt.client.email!,
                receipt.client.name
              );

              if (result.success) {
                Alert.alert('Success', `Receipt sent to ${receipt.client.email}`);
                await refetch();
                if (onReceiptUpdated && receipt) {
                  onReceiptUpdated(receipt);
                }
              } else {
                Alert.alert('Error', result.error || 'Failed to send email');
              }
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to send email');
            } finally {
              setSending(false);
            }
          },
        },
      ]
    );
  };

  const handleShareReceipt = async () => {
    if (!receipt) return;

    try {
      setGeneratingPDF(true);
      const html = generateReceiptHTML(receipt);
      const filename = generateReceiptFilename(receipt);

      // For React Native, we'll share the HTML content
      // In a production app, you'd use react-native-html-to-pdf to convert to PDF first
      const message = `Receipt ${receipt.receiptNumber}\n\nClient: ${receipt.client.name}\nAmount: $${receipt.totalAmount.toFixed(2)}\nDate: ${new Date(receipt.serviceDate).toLocaleDateString()}`;

      await Share.share({
        message,
        title: `Receipt ${receipt.receiptNumber}`,
      });
    } catch (error) {
      console.error('[ReceiptDetailsModal] Error sharing receipt:', error);
      Alert.alert('Error', 'Failed to share receipt');
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!receipt) return;

    try {
      setGeneratingPDF(true);
      const html = generateReceiptHTML(receipt);
      const filename = generateReceiptFilename(receipt);

      // For React Native, we would use react-native-html-to-pdf or expo-print
      // For now, we'll show an alert with options
      Alert.alert(
        'Download Receipt',
        'PDF generation requires additional setup. Would you like to:',
        [
          {
            text: 'Share Receipt',
            onPress: handleShareReceipt,
          },
          {
            text: 'Email Receipt',
            onPress: receipt.client.email ? handleSendEmail : undefined,
            style: receipt.client.email ? 'default' : 'cancel',
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    } catch (error) {
      console.error('[ReceiptDetailsModal] Error downloading PDF:', error);
      Alert.alert('Error', 'Failed to download PDF');
    } finally {
      setGeneratingPDF(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatPaymentMethod = (method: string) => {
    return method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (!isOpen) return null;

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
          <Text style={[styles.headerTitle, { color: tokens.textPrimary }]}>Receipt Details</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={tokens.textPrimary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={tokens.accent} />
            <Text style={[styles.loadingText, { color: tokens.textSecondary }]}>Loading receipt...</Text>
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
        ) : receipt ? (
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
            {/* Receipt Number & Status */}
            <View style={[styles.receiptHeader, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
              <View>
                <Text style={[styles.receiptLabel, { color: tokens.textSecondary }]}>Receipt Number</Text>
                <Text style={[styles.receiptNumber, { color: tokens.textPrimary }]}>{receipt.receiptNumber}</Text>
              </View>
              <View style={styles.statusContainer}>
                <View style={[
                  styles.statusBadge,
                  {
                    backgroundColor: receipt.status === 'paid' ? '#E8F5E9' : receipt.status === 'sent' ? '#E3F2FD' : '#FFF3E0',
                    borderColor: receipt.status === 'paid' ? '#4CAF50' : receipt.status === 'sent' ? '#2196F3' : '#FF9800'
                  }
                ]}>
                  <Text style={[
                    styles.statusText,
                    { color: receipt.status === 'paid' ? '#4CAF50' : receipt.status === 'sent' ? '#2196F3' : '#FF9800' }
                  ]}>
                    {receipt.status.toUpperCase()}
                  </Text>
                </View>
                {receipt.emailStatus && <EmailStatusBadge status={receipt.emailStatus} />}
              </View>
            </View>

            {/* Client Information */}
            <View style={[styles.section, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
              <Text style={[styles.sectionTitle, { color: tokens.textPrimary }]}>Client Information</Text>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: tokens.textSecondary }]}>Name</Text>
                <Text style={[styles.infoValue, { color: tokens.textPrimary }]}>{receipt.client.name}</Text>
              </View>
              {receipt.client.email && (
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: tokens.textSecondary }]}>Email</Text>
                  <Text style={[styles.infoValue, { color: tokens.textPrimary }]}>{receipt.client.email}</Text>
                </View>
              )}
              {receipt.client.phone && (
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: tokens.textSecondary }]}>Phone</Text>
                  <Text style={[styles.infoValue, { color: tokens.textPrimary }]}>{receipt.client.phone}</Text>
                </View>
              )}
            </View>

            {/* Service Items */}
            <View style={[styles.section, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
              <Text style={[styles.sectionTitle, { color: tokens.textPrimary }]}>Services Provided</Text>
              {receipt.items.map((item, index) => (
                <View
                  key={item.id}
                  style={[
                    styles.itemRow,
                    index < receipt.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: tokens.border }
                  ]}
                >
                  <View style={styles.itemDetails}>
                    <Text style={[styles.itemDescription, { color: tokens.textPrimary }]}>
                      {item.description}
                    </Text>
                    <Text style={[styles.itemMeta, { color: tokens.textSecondary }]}>
                      {item.quantity} {item.billingMode === 'hours' ? 'hrs' : 'qty'} × ${item.unitPrice.toFixed(2)}
                    </Text>
                  </View>
                  <Text style={[styles.itemTotal, { color: tokens.textPrimary }]}>
                    ${item.totalPrice.toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>

            {/* Totals Summary */}
            <ReceiptSummary items={receipt.items} />

            {/* Payment Details */}
            <View style={[styles.section, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
              <Text style={[styles.sectionTitle, { color: tokens.textPrimary }]}>Payment Details</Text>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: tokens.textSecondary }]}>Payment Method</Text>
                <Text style={[styles.infoValue, { color: tokens.textPrimary }]}>
                  {formatPaymentMethod(receipt.paymentMethod)}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: tokens.textSecondary }]}>Service Date</Text>
                <Text style={[styles.infoValue, { color: tokens.textPrimary }]}>
                  {formatDate(receipt.serviceDate)}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: tokens.textSecondary }]}>Payment Date</Text>
                <Text style={[styles.infoValue, { color: tokens.textPrimary }]}>
                  {formatDate(receipt.paymentDate)}
                </Text>
              </View>
            </View>

            {/* Notes */}
            {receipt.notes && (
              <View style={[styles.section, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
                <Text style={[styles.sectionTitle, { color: tokens.textPrimary }]}>Notes</Text>
                <Text style={[styles.notesText, { color: tokens.textSecondary }]}>{receipt.notes}</Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actions}>
              {onEditPress && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
                  onPress={() => onEditPress(receipt.id)}
                >
                  <Ionicons name="create-outline" size={18} color={tokens.accent} />
                  <Text style={[styles.actionButtonText, { color: tokens.accent }]}>Edit Receipt</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
                onPress={handleShareReceipt}
                disabled={generatingPDF}
              >
                {generatingPDF ? (
                  <ActivityIndicator size="small" color={tokens.accent} />
                ) : (
                  <>
                    <Ionicons name="share-outline" size={18} color={tokens.accent} />
                    <Text style={[styles.actionButtonText, { color: tokens.accent }]}>Share</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
                onPress={handleDownloadPDF}
                disabled={generatingPDF}
              >
                {generatingPDF ? (
                  <ActivityIndicator size="small" color={tokens.accent} />
                ) : (
                  <>
                    <Ionicons name="download-outline" size={18} color={tokens.accent} />
                    <Text style={[styles.actionButtonText, { color: tokens.accent }]}>Download PDF</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: tokens.accent },
                  (!receipt.client.email || sending) && { opacity: 0.5 }
                ]}
                onPress={handleSendEmail}
                disabled={!receipt.client.email || sending}
              >
                {sending ? (
                  <ActivityIndicator size="small" color={tokens.background} />
                ) : (
                  <>
                    <Ionicons name="send" size={18} color={tokens.background} />
                    <Text style={[styles.actionButtonText, { color: tokens.background }]}>
                      {receipt.emailStatus === 'sent' || receipt.emailStatus === 'delivered' ? 'Resend Email' : 'Send Email'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
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
  receiptHeader: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  receiptLabel: {
    fontSize: 11,
    fontFamily: "lores-9-wide",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  receiptNumber: {
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
