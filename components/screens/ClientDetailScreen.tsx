"use client";

import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../../theme/ThemeContext";
import { useApi } from "../../lib/hooks/useApi";
import { clientsApi } from "../../lib/api/endpoints";
import NeomorphicCard from "../NeomorphicCard";
import TestimonialsPanel from "../TestimonialsPanel";
import ClientNotesPanel from "../ClientNotesPanel";
import ClientConversationsPanel from "../ClientConversationsPanel";
import ReceiptsPanel from "../ReceiptsPanel";
import ServiceLinesPanel from "../ServiceLinesPanel";
import ReceiptModal from "../billing/ReceiptModal";

interface ClientDetailScreenProps {
  clientId: string;
  onBack: () => void;
}

export default function ClientDetailScreen({ clientId, onBack }: ClientDetailScreenProps) {
  const { tokens } = useTheme();
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch client data
  const { data: client, loading, error } = useApi(
    () => clientsApi.getClient(clientId),
    [clientId]
  );

  // Quick action handlers
  const handleMessage = () => {
    console.log('[ClientDetailScreen] Message client:', clientId);
    // TODO: Open message composer
  };

  const handleAppointment = () => {
    console.log('[ClientDetailScreen] Create appointment:', clientId);
    // TODO: Open appointment scheduler
  };

  const handleReceipt = () => {
    setShowReceiptModal(true);
  };

  const handleNote = () => {
    console.log('[ClientDetailScreen] Add note:', clientId);
    // TODO: Open note editor
  };

  const handleTimer = () => {
    console.log('[ClientDetailScreen] Start timer:', clientId);
    // TODO: Start time tracking
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: tokens.background }]}>
        <Text style={[styles.loadingText, { color: tokens.textSecondary }]}>
          Loading client details...
        </Text>
      </View>
    );
  }

  if (error || !client) {
    return (
      <View style={[styles.container, { backgroundColor: tokens.background }]}>
        <Text style={[styles.errorText, { color: tokens.error || '#ef4444' }]}>
          {error || 'Client not found'}
        </Text>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={[styles.backButtonText, { color: tokens.accent }]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: tokens.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={tokens.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={[styles.clientName, { color: tokens.textPrimary }]}>
            {client.name}
          </Text>
          {client.status && (
            <Text style={[styles.clientStatus, { color: tokens.accent }]}>
              {client.status}
            </Text>
          )}
        </View>
      </View>

      {/* Quick Actions */}
      <NeomorphicCard style={styles.card} contentStyle={styles.cardContent}>
        <Text style={[styles.sectionTitle, { color: tokens.textPrimary }]}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity
            style={[styles.quickActionBtn, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
            onPress={handleMessage}
          >
            <Feather name="message-circle" size={20} color={tokens.accent} />
            <Text style={[styles.quickActionText, { color: tokens.textPrimary }]}>Message</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickActionBtn, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
            onPress={handleAppointment}
          >
            <Feather name="calendar" size={20} color={tokens.accent} />
            <Text style={[styles.quickActionText, { color: tokens.textPrimary }]}>Appointment</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickActionBtn, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
            onPress={handleReceipt}
          >
            <Feather name="file-text" size={20} color={tokens.accent} />
            <Text style={[styles.quickActionText, { color: tokens.textPrimary }]}>Receipt</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickActionBtn, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
            onPress={handleNote}
          >
            <Feather name="edit-3" size={20} color={tokens.accent} />
            <Text style={[styles.quickActionText, { color: tokens.textPrimary }]}>Note</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickActionBtn, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
            onPress={handleTimer}
          >
            <Feather name="clock" size={20} color={tokens.accent} />
            <Text style={[styles.quickActionText, { color: tokens.textPrimary }]}>Timer</Text>
          </TouchableOpacity>
        </View>
      </NeomorphicCard>

      {/* Contact Information */}
      <NeomorphicCard style={styles.card} contentStyle={styles.cardContent}>
        <Text style={[styles.sectionTitle, { color: tokens.textPrimary }]}>Contact Information</Text>
        <View style={styles.infoGrid}>
          {client.email && (
            <View style={styles.infoRow}>
              <Feather name="mail" size={16} color={tokens.textSecondary} />
              <Text style={[styles.infoLabel, { color: tokens.textSecondary }]}>Email</Text>
              <Text style={[styles.infoValue, { color: tokens.textPrimary }]}>{client.email}</Text>
            </View>
          )}
          {client.phone && (
            <View style={styles.infoRow}>
              <Feather name="phone" size={16} color={tokens.textSecondary} />
              <Text style={[styles.infoLabel, { color: tokens.textSecondary }]}>Phone</Text>
              <Text style={[styles.infoValue, { color: tokens.textPrimary }]}>{client.phone}</Text>
            </View>
          )}
          {client.address && (
            <View style={styles.infoRow}>
              <Feather name="map-pin" size={16} color={tokens.textSecondary} />
              <Text style={[styles.infoLabel, { color: tokens.textSecondary }]}>Address</Text>
              <Text style={[styles.infoValue, { color: tokens.textPrimary }]}>
                {[
                  client.address.street,
                  client.address.city,
                  client.address.state,
                  client.address.zip
                ].filter(Boolean).join(', ') || 'N/A'}
              </Text>
            </View>
          )}
        </View>
      </NeomorphicCard>

      {/* Service Lines */}
      <NeomorphicCard style={styles.card} contentStyle={styles.cardContent}>
        <Text style={[styles.sectionTitle, { color: tokens.textPrimary }]}>Service Lines</Text>
        <ServiceLinesPanel />
      </NeomorphicCard>

      {/* Billing */}
      <NeomorphicCard style={styles.card} contentStyle={styles.cardContent}>
        <Text style={[styles.sectionTitle, { color: tokens.textPrimary }]}>Billing</Text>
        <Text style={[styles.sectionSubtitle, { color: tokens.textSecondary }]}>
          Recent receipts and invoices
        </Text>
        <ReceiptsPanel
          clientId={clientId}
          refreshKey={refreshKey}
          onCreateReceipt={handleReceipt}
        />
      </NeomorphicCard>

      {/* Testimonials */}
      <NeomorphicCard style={styles.card} contentStyle={styles.cardContent}>
        <Text style={[styles.sectionTitle, { color: tokens.textPrimary }]}>Testimonials</Text>
        <TestimonialsPanel clientId={clientId} />
      </NeomorphicCard>

      {/* Notes */}
      <NeomorphicCard style={styles.card} contentStyle={styles.cardContent}>
        <Text style={[styles.sectionTitle, { color: tokens.textPrimary }]}>Notes</Text>
        <ClientNotesPanel />
      </NeomorphicCard>

      {/* Conversations */}
      <NeomorphicCard style={styles.card} contentStyle={styles.cardContent}>
        <Text style={[styles.sectionTitle, { color: tokens.textPrimary }]}>Conversations</Text>
        <ClientConversationsPanel />
      </NeomorphicCard>

      {/* Receipt Creation Modal */}
      <ReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        initialClientId={clientId}
        onReceiptCreated={() => {
          setShowReceiptModal(false);
          setRefreshKey(prev => prev + 1); // Trigger refresh of ReceiptsPanel
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 12,
  },
  backBtn: {
    padding: 8,
  },
  headerText: {
    flex: 1,
  },
  clientName: {
    fontSize: 24,
    fontWeight: "700",
    fontFamily: "Bytesized-Regular",
  },
  clientStatus: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4,
  },
  card: {
    width: '100%',
    marginBottom: 16,
  },
  cardContent: {
    padding: 16,
    width: '100%',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    fontFamily: "Bytesized-Regular",
  },
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: 12,
    fontFamily: "lores-9-wide",
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    width: '100%',
  },
  quickActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 130,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "lores-9-wide",
  },
  infoGrid: {
    gap: 14,
    width: '100%',
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: '100%',
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    minWidth: 80,
    fontFamily: "lores-9-wide",
  },
  infoValue: {
    fontSize: 15,
    flex: 1,
    fontFamily: "lores-9-wide",
  },
  loadingText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 40,
    fontFamily: "lores-9-wide",
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 40,
    fontFamily: "lores-9-wide",
  },
  backButton: {
    marginTop: 20,
    alignSelf: "center",
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "lores-9-wide",
  },
});
