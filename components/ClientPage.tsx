"use client";

import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemeTokens, useTheme } from "../theme/ThemeContext";
import ClientNotesPanel from "./ClientNotesPanel";
import TestimonialsPanel from "./TestimonialsPanel";
import ConversationTimelinePanel from "./ConversationTimelinePanel";
import CalendarIntegrationPanel from "./CalendarIntegrationPanel";
import ReceiptsPanel from "./ReceiptsPanel";
import BillingDocumentsPanel from "./BillingDocumentsPanel";
import ConversationSummaryPanel from "./ConversationSummaryPanel";
import ClientConversationsPanel from "./ClientConversationsPanel";
import ServiceLinesPanel from "./ServiceLinesPanel";
import ConversationDetailPanel from "./ConversationDetailPanel";
import ClientSelectorPanel from "./ClientSelectorPanel";
import QuickMessagePanel from "./QuickMessagePanel";
import CRMIntegrationPanel from "./CRMIntegrationPanel";
import ReceiptDetailsPanel from "./ReceiptDetailsPanel";
import CalendarIntegrationManagerPanel from "./CalendarIntegrationManagerPanel";
import MessageImporterPanel from "./MessageImporterPanel";
import GoalsWidget from "./GoalsWidget";
import NeomorphicCard from "./NeomorphicCard";
import { getClientsApiUrl } from "./getClientsUrl";
import ReceiptModal from "./billing/ReceiptModal";

const quickActions = [
  { label: "Add note", meta: "Clients" },
  { label: "Create task", meta: "Follow-up" },
  { label: "Send receipt", meta: "Email" },
  { label: "Request testimonial", meta: "Email" },
];

const kpis = [
  { label: "Active clients", value: "24", trend: "+3 this week" },
  { label: "Open invoices", value: "$14.2K", trend: "Due in 5 days" },
  { label: "Conversations", value: "76", trend: "New 8 today" },
  { label: "Testimonials", value: "9", trend: "2 pending" },
];
interface Client {
  id: string;
  name: string;
  note?: string;
  status?: string;
  statusColor?: string;
  createdAt?: string;
}

const clientsApiUrl = getClientsApiUrl();

const timeline = [
  { text: "Appointment synced with Google Calendar", label: "Calendar" },
  { text: "Receipt emailed for Marcia event", label: "Receipt" },
  { text: "Testimonial requested via email", label: "Email" },
];

interface ClientPageProps {
  onOpenPreferences: () => void;
  onNavigateToClients: () => void;
  onViewClientDetail?: (clientId: string) => void;
}

export default function ClientPage({
  onOpenPreferences,
  onNavigateToClients,
  onViewClientDetail,
}: ClientPageProps) {
  const { tokens } = useTheme();
  const styles = React.useMemo(() => createStyles(tokens), [tokens]);
  const [clientsList, setClientsList] = React.useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = React.useState(true);
  const [clientsError, setClientsError] = React.useState<string | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const handleQuickAction = (action: string) => {
    if (action === "Send receipt") {
      setShowReceiptModal(true);
    } else {
      console.log(`[ClientPage] Quick action:`, action);
      // TODO: Implement other quick actions
    }
  };

  React.useEffect(() => {
    let active = true;
    const load = async () => {
      setClientsLoading(true);
      setClientsError(null);
      try {
        const response = await fetch(clientsApiUrl);
        const payloadText = await response.text();
        let parsed: any = null;
        try {
          parsed = JSON.parse(payloadText);
        } catch {
          parsed = null;
        }

        console.log("[ClientPage] clients fetch", clientsApiUrl, response.status, parsed || payloadText);

        if (!response.ok) {
          const errMessage =
            parsed?.error || parsed?.message || response.statusText || "HTTP error";
          throw new Error(errMessage);
        }

        const incoming =
          Array.isArray(parsed) && parsed.length > 0
            ? parsed
            : Array.isArray(parsed?.data)
            ? parsed.data
            : Array.isArray(parsed?.clients)
            ? parsed.clients
            : [];

        // Sort by createdAt descending (most recent first), limit to 9
        const sorted = incoming
          .sort((a, b) => {
            // Handle missing createdAt - put at end
            if (!a.createdAt && !b.createdAt) return 0;
            if (!a.createdAt) return 1;
            if (!b.createdAt) return -1;

            // Parse dates and compare (newer first)
            try {
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            } catch (e) {
              console.warn('[ClientPage] Invalid date:', a.createdAt, b.createdAt);
              return 0;
            }
          })
          .slice(0, 9);

        if (active) {
          setClientsList(sorted);
        }
      } catch (error) {
        if (active) {
          setClientsError(
            error instanceof Error ? error.message : "Unable to load clients"
          );
        }
      } finally {
        if (active) {
          setClientsLoading(false);
        }
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [clientsApiUrl]);

  return (
    <ScrollView
      contentContainerStyle={styles.scrollArea}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.kpiRow}>
        {kpis.map((kpi) => (
          <View style={styles.kpiCard} key={kpi.label}>
            <Text style={styles.kpiLabel}>{kpi.label}</Text>
            <Text style={styles.kpiValue}>{kpi.value}</Text>
            <Text style={styles.kpiTrend}>{kpi.trend}</Text>
          </View>
        ))}
      </View>

      <ClientSelectorPanel
        variant="recent"
        onNavigateToClients={onNavigateToClients}
        onViewClientDetail={onViewClientDetail}
      />

      <NeomorphicCard style={styles.cardWrapper} contentStyle={styles.card}>
        <Text style={styles.sectionTitle}>Quick actions</Text>
        <View style={styles.actionsGrid}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.actionChip}
              onPress={() => handleQuickAction(action.label)}
            >
              <Text style={styles.actionLabel}>{action.label}</Text>
              <Text style={styles.actionValue}>{action.meta}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <QuickMessagePanel />
      </NeomorphicCard>

      <NeomorphicCard style={styles.cardWrapper} contentStyle={styles.card}>
        <View style={styles.clientsHeader}>
          <Text style={styles.sectionTitle}>Recent Clients</Text>
          <TouchableOpacity
            onPress={onNavigateToClients}
            style={styles.iconButton}
            activeOpacity={0.6}
          >
            <Ionicons name="chevron-forward" size={18} color={tokens.accent} />
          </TouchableOpacity>
        </View>
        {(clientsLoading || clientsError) && (
          <Text style={styles.loadingMessage}>
            {clientsLoading ? "Loading clients…" : clientsError}
          </Text>
        )}
        {clientsLoading && (
          <Text style={styles.loadingMessage}>Loading database...</Text>
        )}
        {clientsList.length > 0 && clientsList.map((client) => {
          const noteText = client.note ?? "No notes yet";
          const badgeColor = client.statusColor || tokens.highlight;
          const statusLabel = client.status || "Draft";
          return (
            <View style={styles.clientRow} key={`${client.id}-${client.name}`}>
              <View>
                <Text style={styles.clientName}>{client.name}</Text>
                <Text style={styles.clientNote}>{noteText}</Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { borderColor: badgeColor },
                ]}
              >
                <Text
                  style={[styles.statusText, { color: badgeColor }]}
                >
                  {statusLabel}
                </Text>
              </View>
            </View>
          );
        })}
        <ClientNotesPanel />
        <TestimonialsPanel />
      </NeomorphicCard>

      <NeomorphicCard style={styles.cardWrapper} contentStyle={styles.card}>
        <Text style={styles.sectionTitle}>Timeline</Text>
        {timeline.map((event, index) => (
          <View
            key={event.text}
            style={[
              styles.timelineRow,
              index !== timeline.length - 1 && styles.timelineDivider,
            ]}
          >
            <Text style={styles.timelineLabel}>{event.label}</Text>
            <Text style={styles.timelineText}>{event.text}</Text>
          </View>
        ))}
        <ConversationTimelinePanel />
        <ConversationSummaryPanel />
        <ClientConversationsPanel />
        <ConversationDetailPanel />
      </NeomorphicCard>

      <NeomorphicCard style={styles.cardWrapper} contentStyle={styles.card}>
        <Text style={styles.sectionTitle}>Email tasks</Text>
        <Text style={styles.sectionBody}>
          Send receipts and testimonial requests, review delivery status, and copy details straight into the client timeline.
        </Text>
        <TouchableOpacity style={styles.primaryButton}>
          <Text style={styles.primaryText}>Send receipt</Text>
        </TouchableOpacity>
        <ReceiptsPanel />
      </NeomorphicCard>

      <NeomorphicCard style={styles.cardWrapper} contentStyle={styles.card}>
        <Text style={styles.sectionTitle}>Calendar sync</Text>
        <Text style={styles.sectionBody}>
          Optional connections to Google or Notion calendars keep appointments flowing both ways. Sync once, forget friction.
        </Text>
        <CalendarIntegrationPanel />
        <CalendarIntegrationManagerPanel />
      </NeomorphicCard>

      <NeomorphicCard style={styles.cardWrapper} contentStyle={styles.card}>
        <Text style={styles.sectionTitle}>Billing</Text>
        <Text style={styles.sectionBody}>
          Manage invoices, quotes, and receipts from the same neomorphic inbox.
        </Text>
        <ReceiptsPanel />
        <ReceiptDetailsPanel />
        <BillingDocumentsPanel />
      </NeomorphicCard>

      <NeomorphicCard style={styles.cardWrapper} contentStyle={styles.card}>
        <Text style={styles.sectionTitle}>Service lines</Text>
        <Text style={styles.sectionBody}>
          Align segments, goals, and tactical plans from the sidebar’s service lines.
        </Text>
        <ServiceLinesPanel />
      </NeomorphicCard>

      <GoalsWidget />

      <NeomorphicCard style={styles.cardWrapper} contentStyle={styles.card}>
        <Text style={styles.sectionTitle}>CRM integration</Text>
        <Text style={styles.sectionBody}>
          Run AI-powered imports and CRM integration flows directly from the dashboard.
        </Text>
        <CRMIntegrationPanel />
        <MessageImporterPanel />
      </NeomorphicCard>

      <NeomorphicCard style={styles.cardWrapper} contentStyle={styles.card}>
        <Text style={styles.sectionTitle}>Notifications & Modals</Text>
        <Text style={styles.sectionBody}>
          Notifications, activity log, account settings, and preferences reuse the same tactile, neomorphic modals as the web experience.
        </Text>
        <TouchableOpacity style={styles.modalButtonInline} onPress={onOpenPreferences}>
          <Text style={styles.modalButtonText}>Open preferences</Text>
        </TouchableOpacity>
      </NeomorphicCard>

      {/* Receipt Creation Modal */}
      <ReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        onReceiptCreated={() => {
          setShowReceiptModal(false);
        }}
      />
    </ScrollView>
  );
}

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    scrollArea: {
      paddingHorizontal: 16,
      paddingBottom: 32,
    },
    navRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    navChip: {
      backgroundColor: tokens.surface,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 12,
      marginBottom: 10,
      width: "48%",
      borderWidth: 1,
      borderColor: tokens.border,
    },
    navChipText: {
      color: tokens.textSecondary,
      fontSize: 11,
      textTransform: "uppercase",
    },
    cardWrapper: {
      marginBottom: 18,
    },
    card: {
      padding: 20,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    clientsHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    allButton: {
      color: tokens.accent,
      fontSize: 11,
      fontWeight: "700",
      textTransform: "uppercase",
    },
    iconButton: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: tokens.surface,
      borderWidth: 1,
      borderColor: tokens.border,
      justifyContent: "center",
      alignItems: "center",
      shadowColor: tokens.shadowDark,
      shadowOffset: { width: 1, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 2,
    },
    sectionTitle: {
      color: tokens.textPrimary,
      fontSize: 18,
      fontWeight: "600",
      marginBottom: 12,
      fontFamily: "Bytesized-Regular",
    },
    actionsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },
    actionChip: {
      width: "48%",
      backgroundColor: tokens.surface,
      borderRadius: 16,
      padding: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: tokens.border,
      shadowColor: tokens.shadowDark,
      shadowOffset: { width: 2, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 3,
    },
    actionLabel: {
      color: tokens.textSecondary,
      fontWeight: "600",
      fontFamily: "lores-9-wide",
    },
    actionValue: {
      marginTop: 6,
      color: tokens.highlight,
      fontSize: 12,
    },
    clientRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    loadingMessage: {
      color: tokens.textSecondary,
      fontSize: 12,
      marginBottom: 10,
    },
    clientName: {
      color: tokens.textPrimary,
      fontWeight: "600",
      fontSize: 16,
    },
    clientNote: {
      color: tokens.textSecondary,
      fontSize: 12,
    },
    statusBadge: {
      borderWidth: 1,
      borderRadius: 999,
      paddingVertical: 4,
      paddingHorizontal: 12,
    },
    statusText: {
      fontSize: 12,
      fontWeight: "600",
    },
    timelineRow: {
      flexDirection: "column",
      paddingVertical: 10,
    },
    timelineDivider: {
      borderBottomWidth: 1,
      borderBottomColor: tokens.border,
    },
    timelineLabel: {
      color: tokens.accent,
      fontSize: 12,
      marginBottom: 6,
    },
    timelineText: {
      color: tokens.textPrimary,
      fontSize: 14,
    },
    sectionBody: {
      color: tokens.textSecondary,
      fontSize: 14,
      marginBottom: 14,
      lineHeight: 20,
    },
    primaryButton: {
      backgroundColor: tokens.accent,
      borderRadius: 16,
      paddingVertical: 12,
      alignItems: "center",
    },
    primaryText: {
      color: tokens.background,
      fontWeight: "700",
    },
    modalButtonInline: {
      marginTop: 10,
      backgroundColor: tokens.accent,
      borderRadius: 16,
      paddingVertical: 10,
      alignItems: "center",
    },
    modalButtonText: {
      color: tokens.background,
      fontWeight: "600",
    },
    kpiRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      marginBottom: 16,
    },
  kpiCard: {
    backgroundColor: tokens.surface,
    borderRadius: 16,
    padding: 14,
    width: "48%",
    borderWidth: 1,
    borderColor: tokens.border,
    marginBottom: 12,
    shadowColor: tokens.shadowDark,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
    kpiLabel: {
      color: tokens.textSecondary,
      textTransform: "uppercase",
      fontSize: 10,
      marginBottom: 6,
    },
    kpiValue: {
      color: tokens.textPrimary,
      fontSize: 24,
      fontWeight: "700",
    },
    kpiTrend: {
      color: tokens.highlight,
      fontSize: 12,
      marginTop: 4,
    },
  });
