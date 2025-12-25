"use client";

import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
import TestimonialRequestModal from "../TestimonialRequestModal";
import HouseholdModal from "../modals/HouseholdModal";
import { useClientHousehold } from "../../hooks/useHouseholds";
import {
  getHouseholdTypeLabel,
  getHouseholdTypeIcon,
  getMemberCountText,
} from "../../services/households";

interface ClientDetailScreenProps {
  clientId: string;
  onBack: () => void;
  onNavigateToClient?: (clientId: string) => void;
}

export default function ClientDetailScreen({ clientId, onBack, onNavigateToClient }: ClientDetailScreenProps) {
  const { tokens } = useTheme();
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showTestimonialModal, setShowTestimonialModal] = useState(false);
  const [showHouseholdModal, setShowHouseholdModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch client data
  const { data: client, loading, error, refetch: refetchClient } = useApi(
    () => clientsApi.getClient(clientId),
    [clientId]
  );

  // Fetch client's household
  const {
    household: clientHousehold,
    loading: loadingHousehold,
    refetch: refetchHousehold,
  } = useClientHousehold(clientId);

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
          <Ionicons name="arrow-back" size={24} color={tokens.textPrimary} />
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
            <Ionicons name="chatbubble" size={20} color={tokens.accent} />
            <Text style={[styles.quickActionText, { color: tokens.textPrimary }]}>Message</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickActionBtn, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
            onPress={handleAppointment}
          >
            <Ionicons name="calendar" size={20} color={tokens.accent} />
            <Text style={[styles.quickActionText, { color: tokens.textPrimary }]}>Appointment</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickActionBtn, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
            onPress={handleReceipt}
          >
            <Ionicons name="document-text" size={20} color={tokens.accent} />
            <Text style={[styles.quickActionText, { color: tokens.textPrimary }]}>Receipt</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickActionBtn, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
            onPress={handleNote}
          >
            <Ionicons name="create" size={20} color={tokens.accent} />
            <Text style={[styles.quickActionText, { color: tokens.textPrimary }]}>Note</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickActionBtn, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
            onPress={handleTimer}
          >
            <Ionicons name="timer" size={20} color={tokens.accent} />
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
              <Ionicons name="mail-outline" size={16} color={tokens.textSecondary} />
              <Text style={[styles.infoLabel, { color: tokens.textSecondary }]}>Email</Text>
              <Text style={[styles.infoValue, { color: tokens.textPrimary }]}>{client.email}</Text>
            </View>
          )}
          {client.phone && (
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={16} color={tokens.textSecondary} />
              <Text style={[styles.infoLabel, { color: tokens.textSecondary }]}>Phone</Text>
              <Text style={[styles.infoValue, { color: tokens.textPrimary }]}>{client.phone}</Text>
            </View>
          )}
          {client.address && (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={16} color={tokens.textSecondary} />
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

      {/* Household Section */}
      <NeomorphicCard style={styles.card} contentStyle={styles.cardContent}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="people" size={20} color={tokens.accent} />
            <Text style={[styles.sectionTitle, { color: tokens.textPrimary, marginBottom: 0 }]}>
              Household
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.manageButton, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
            onPress={() => setShowHouseholdModal(true)}
          >
            <Text style={[styles.manageButtonText, { color: tokens.accent }]}>
              {clientHousehold ? 'Manage' : 'Add'}
            </Text>
          </TouchableOpacity>
        </View>

        {loadingHousehold ? (
          <View style={styles.householdLoading}>
            <ActivityIndicator size="small" color={tokens.accent} />
            <Text style={[styles.householdLoadingText, { color: tokens.textSecondary }]}>
              Loading household...
            </Text>
          </View>
        ) : clientHousehold ? (
          <View style={styles.householdContent}>
            {/* Household Info */}
            <View style={[styles.householdCard, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
              <View style={[styles.householdIconContainer, { backgroundColor: tokens.accent + '15' }]}>
                <Ionicons
                  name={getHouseholdTypeIcon(clientHousehold.accountType) as any}
                  size={24}
                  color={tokens.accent}
                />
              </View>
              <View style={styles.householdInfo}>
                <Text style={[styles.householdName, { color: tokens.textPrimary }]}>
                  {clientHousehold.name}
                </Text>
                <Text style={[styles.householdMeta, { color: tokens.textSecondary }]}>
                  {getHouseholdTypeLabel(clientHousehold.accountType)} - {getMemberCountText(clientHousehold.memberCount)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={tokens.textSecondary} />
            </View>

            {/* Household Members */}
            {clientHousehold.members && clientHousehold.members.length > 0 && (
              <View style={styles.membersSection}>
                <Text style={[styles.membersLabel, { color: tokens.textSecondary }]}>
                  Household Members
                </Text>
                <View style={styles.membersList}>
                  {clientHousehold.members.slice(0, 4).map((member) => (
                    <TouchableOpacity
                      key={member.id}
                      style={[
                        styles.memberChip,
                        { backgroundColor: tokens.surface, borderColor: tokens.border },
                        member.id === clientId && { borderColor: tokens.accent, backgroundColor: tokens.accent + '10' },
                      ]}
                      onPress={() => {
                        if (member.id !== clientId && onNavigateToClient) {
                          onNavigateToClient(member.id);
                        }
                      }}
                      disabled={member.id === clientId}
                    >
                      <Text
                        style={[
                          styles.memberChipText,
                          { color: member.id === clientId ? tokens.accent : tokens.textPrimary },
                        ]}
                        numberOfLines={1}
                      >
                        {member.name}
                        {member.id === clientId && ' (You)'}
                      </Text>
                      {member.isPrimaryContact && (
                        <Ionicons name="star" size={12} color={tokens.accent} />
                      )}
                    </TouchableOpacity>
                  ))}
                  {clientHousehold.members.length > 4 && (
                    <View style={[styles.memberChip, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
                      <Text style={[styles.memberChipText, { color: tokens.textSecondary }]}>
                        +{clientHousehold.members.length - 4} more
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.noHousehold}>
            <Ionicons name="home-outline" size={32} color={tokens.textSecondary} />
            <Text style={[styles.noHouseholdText, { color: tokens.textSecondary }]}>
              Not part of a household
            </Text>
            <Text style={[styles.noHouseholdSubtext, { color: tokens.textSecondary }]}>
              Add to a household to group related clients together
            </Text>
          </View>
        )}
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
        <TestimonialsPanel
          clientId={clientId}
          onAddTestimonial={() => setShowTestimonialModal(true)}
        />
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

      {/* Testimonial Request Modal */}
      <TestimonialRequestModal
        visible={showTestimonialModal}
        onClose={() => setShowTestimonialModal(false)}
        clientId={clientId}
        onRequestSent={() => {
          setShowTestimonialModal(false);
          setRefreshKey(prev => prev + 1); // Trigger refresh of TestimonialsPanel
        }}
      />

      {/* Household Modal */}
      <HouseholdModal
        visible={showHouseholdModal}
        clientId={clientId}
        clientName={client.name}
        onClose={() => setShowHouseholdModal(false)}
        onHouseholdUpdated={() => {
          refetchHousehold();
          refetchClient();
        }}
        onNavigateToClient={onNavigateToClient}
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
  // Household section styles
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  manageButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  manageButtonText: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "lores-9-wide",
  },
  householdLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 20,
  },
  householdLoadingText: {
    fontSize: 14,
    fontFamily: "lores-9-wide",
  },
  householdContent: {
    gap: 12,
  },
  householdCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  householdIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  householdInfo: {
    flex: 1,
  },
  householdName: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Bytesized-Regular",
  },
  householdMeta: {
    fontSize: 13,
    marginTop: 2,
    fontFamily: "lores-9-wide",
  },
  membersSection: {
    marginTop: 4,
  },
  membersLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 8,
    fontFamily: "lores-9-wide",
  },
  membersList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  memberChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  memberChipText: {
    fontSize: 13,
    fontWeight: "500",
    fontFamily: "lores-9-wide",
    maxWidth: 120,
  },
  noHousehold: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 8,
  },
  noHouseholdText: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: 4,
    fontFamily: "Bytesized-Regular",
  },
  noHouseholdSubtext: {
    fontSize: 13,
    textAlign: "center",
    fontFamily: "lores-9-wide",
  },
});
