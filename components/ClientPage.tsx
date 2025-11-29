 "use client";

import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import ClientNotesPanel from "./ClientNotesPanel";
import TestimonialsPanel from "./TestimonialsPanel";

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
const clients = [
  {
    name: "Woodgreen Landscaping",
    note: "Call about invoice",
    status: "On track",
    statusColor: "#5ec7ff",
  },
  {
    name: "Marina Studio",
    note: "Confirm testimonial",
    status: "Reminder",
    statusColor: "#f4d35e",
  },
  {
    name: "Sammy Creative",
    note: "Share gallery updates",
    status: "Sent",
    statusColor: "#91e78f",
  },
];

const timeline = [
  { text: "Appointment synced with Google Calendar", label: "Calendar" },
  { text: "Receipt emailed for Marcia event", label: "Receipt" },
  { text: "Testimonial requested via email", label: "Email" },
];

interface ClientPageProps {
  onOpenPreferences: () => void;
}

export default function ClientPage({ onOpenPreferences }: ClientPageProps) {
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

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Quick actions</Text>
        <View style={styles.actionsGrid}>
          {quickActions.map((action) => (
            <TouchableOpacity key={action.label} style={styles.actionChip}>
              <Text style={styles.actionLabel}>{action.label}</Text>
              <Text style={styles.actionValue}>{action.meta}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Clients</Text>
        {clients.map((client) => (
          <View style={styles.clientRow} key={client.name}>
            <View>
              <Text style={styles.clientName}>{client.name}</Text>
              <Text style={styles.clientNote}>{client.note}</Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                { borderColor: client.statusColor },
              ]}
            >
              <Text
                style={[styles.statusText, { color: client.statusColor }]}
              >
                {client.status}
              </Text>
            </View>
          </View>
        ))}
        <ClientNotesPanel />
        <TestimonialsPanel />
      </View>

      <View style={styles.card}>
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
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Email tasks</Text>
        <Text style={styles.sectionBody}>
          Send receipts and testimonial requests, review delivery status, and copy details straight into the client timeline.
        </Text>
        <TouchableOpacity style={styles.primaryButton}>
          <Text style={styles.primaryText}>Send receipt</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Calendar sync</Text>
        <Text style={styles.sectionBody}>
          Optional connections to Google or Notion calendars keep appointments flowing both ways. Sync once, forget friction.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Notifications & Modals</Text>
        <Text style={styles.sectionBody}>
          Notifications, activity log, account settings, and preferences reuse the same tactile, neomorphic modals as the web experience.
        </Text>
        <TouchableOpacity style={styles.modalButtonInline} onPress={onOpenPreferences}>
          <Text style={styles.modalButtonText}>Open preferences</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollArea: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  navRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navChip: {
    backgroundColor: '#111720',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
    width: '48%',
    borderWidth: 1,
    borderColor: '#1f2335',
  },
  navChipText: {
    color: '#c5cff9',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: '#111720',
    borderRadius: 24,
    padding: 20,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#1d2333',
  },
  sectionTitle: {
    color: '#f9fbff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    fontFamily: 'lores-9-wide',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionChip: {
    width: '48%',
    backgroundColor: '#1b2132',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1f2435',
  },
  actionLabel: {
    color: '#d2ddff',
    fontWeight: '600',
    fontFamily: 'lores-9-wide',
  },
  actionValue: {
    marginTop: 6,
    color: '#90a0cb',
    fontSize: 12,
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  clientName: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  clientNote: {
    color: '#97a4c8',
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
    fontWeight: '600',
  },
  timelineRow: {
    flexDirection: 'column',
    paddingVertical: 10,
  },
  timelineDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#1a1f2b',
  },
  timelineLabel: {
    color: '#6b7bff',
    fontSize: 12,
    marginBottom: 6,
  },
  timelineText: {
    color: '#e5e7ff',
    fontSize: 14,
  },
  sectionBody: {
    color: '#b4bfdd',
    fontSize: 14,
    marginBottom: 14,
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: '#6fb1ff',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryText: {
    color: '#0c1221',
    fontWeight: '700',
  },
  modalButtonInline: {
    marginTop: 10,
    backgroundColor: '#5c93ff',
    borderRadius: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#0f1622',
    fontWeight: '600',
  },
  kpiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  kpiCard: {
    backgroundColor: '#1d2234',
    borderRadius: 16,
    padding: 14,
    width: '48%',
    borderWidth: 1,
    borderColor: '#232a42',
    marginBottom: 12,
  },
  kpiLabel: {
    color: '#9cb3ff',
    textTransform: 'uppercase',
    fontSize: 10,
    marginBottom: 6,
  },
  kpiValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  kpiTrend: {
    color: '#8fd7ff',
    fontSize: 12,
    marginTop: 4,
  },
});
