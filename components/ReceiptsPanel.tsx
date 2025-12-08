"use client";

import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemeTokens, useTheme } from "../theme/ThemeContext";
import { useClientReceipts } from "../hooks/useReceipts";

interface ReceiptsPanelProps {
  clientId?: string;
  refreshKey?: number;
  onCreateReceipt?: () => void;
}

export default function ReceiptsPanel({ clientId, refreshKey, onCreateReceipt }: ReceiptsPanelProps) {
  const { tokens } = useTheme();
  const styles = React.useMemo(() => createStyles(tokens), [tokens]);

  const { receipts, loading, error, refetch } = useClientReceipts(clientId || null);

  // Debug logging
  React.useEffect(() => {
    console.log('[ReceiptsPanel] clientId:', clientId);
    console.log('[ReceiptsPanel] receipts:', receipts.length);
    console.log('[ReceiptsPanel] loading:', loading);
    console.log('[ReceiptsPanel] error:', error);
    if (receipts.length > 0) {
      console.log('[ReceiptsPanel] First receipt:', receipts[0]);
    }
  }, [clientId, receipts, loading, error]);

  // Refetch when refreshKey changes
  React.useEffect(() => {
    if (refreshKey && clientId) {
      console.log('[ReceiptsPanel] Refetching due to refreshKey:', refreshKey);
      refetch();
    }
  }, [refreshKey, clientId, refetch]);

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return '#4CAF50';
      case 'sent':
        return '#2196F3';
      case 'draft':
        return '#FF9800';
      default:
        return tokens.textSecondary;
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="small" color={tokens.accent} />
        <Text style={[styles.loadingText, { color: tokens.textSecondary }]}>
          Loading receipts...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={24} color={tokens.textSecondary} />
        <Text style={[styles.errorText, { color: tokens.textSecondary }]}>
          {error}
        </Text>
      </View>
    );
  }

  if (receipts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="document-text-outline" size={32} color={tokens.textSecondary} />
        <Text style={[styles.emptyText, { color: tokens.textSecondary }]}>
          No receipts yet
        </Text>
        {onCreateReceipt && (
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: tokens.accent }]}
            onPress={onCreateReceipt}
          >
            <Text style={[styles.createButtonText, { color: tokens.background }]}>
              Create Receipt
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      {receipts.map((receipt, index) => (
        <View
          key={receipt.id}
          style={[
            styles.row,
            index === 0 && styles.firstRow
          ]}
        >
          <View style={styles.leftSection}>
            <Text style={[styles.receiptNumber, { color: tokens.textPrimary }]}>
              {receipt.receiptNumber}
            </Text>
            <Text style={[styles.amount, { color: tokens.accent }]}>
              {formatCurrency(receipt.totalAmount)}
            </Text>
          </View>
          <View style={styles.rightSection}>
            <Text style={[styles.status, { color: getStatusColor(receipt.status) }]}>
              {receipt.status.toUpperCase()}
            </Text>
            <Text style={[styles.date, { color: tokens.textSecondary }]}>
              {formatDate(receipt.serviceDate)}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    panel: {
      width: '100%',
      alignSelf: 'stretch',
    },
    centerContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 24,
      gap: 8,
    },
    loadingText: {
      fontSize: 13,
      fontFamily: 'lores-9-wide',
    },
    errorText: {
      fontSize: 13,
      fontFamily: 'lores-9-wide',
      textAlign: 'center',
      marginTop: 8,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 32,
      gap: 12,
    },
    emptyText: {
      fontSize: 14,
      fontFamily: 'lores-9-wide',
    },
    createButton: {
      marginTop: 8,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 12,
    },
    createButtonText: {
      fontSize: 13,
      fontFamily: 'lores-9-wide',
      fontWeight: '700',
    },
    row: {
      borderTopWidth: 1,
      borderTopColor: tokens.border,
      paddingTop: 12,
      paddingBottom: 12,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    firstRow: {
      borderTopWidth: 0,
      paddingTop: 0,
    },
    leftSection: {
      flex: 1,
    },
    rightSection: {
      alignItems: "flex-end",
    },
    receiptNumber: {
      fontSize: 14,
      fontFamily: 'lores-9-wide',
      fontWeight: "700",
      marginBottom: 4,
    },
    amount: {
      fontSize: 16,
      fontFamily: 'Bytesized-Regular',
      fontWeight: "700",
    },
    status: {
      fontSize: 11,
      fontFamily: 'lores-9-wide',
      fontWeight: "700",
      marginBottom: 4,
    },
    date: {
      fontSize: 11,
      fontFamily: 'lores-9-wide',
    },
  });
