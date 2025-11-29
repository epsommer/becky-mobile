import { StatusBar } from 'expo-status-bar';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';

const clients = [
  {
    name: 'Woodgreen Landscaping',
    note: 'Call about invoice',
    status: 'On track',
    statusColor: '#5ec7ff',
  },
  {
    name: 'Marina Studio',
    note: 'Confirm testimonial',
    status: 'Reminder',
    statusColor: '#f4d35e',
  },
  {
    name: 'Sammy Creative',
    note: 'Share gallery updates',
    status: 'Sent',
    statusColor: '#91e78f',
  },
];

const timeline = [
  { text: 'Appointment synced with Google', label: 'Calendar' },
  { text: 'Receipt emailed for Marcia event', label: 'Receipt' },
  { text: 'Testimonial request sent', label: 'Email' },
];

export default function App() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.title}>Becky CRM</Text>
        <Text style={styles.subtitle}>
          Mobile client HQ · Receipts, testimonials, & timeline in one tap
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollArea}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Quick actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={styles.actionChip}>
              <Text style={styles.actionLabel}>Add note</Text>
              <Text style={styles.actionValue}>Clients</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionChip}>
              <Text style={styles.actionLabel}>Create task</Text>
              <Text style={styles.actionValue}>Follow-up</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionChip}>
              <Text style={styles.actionLabel}>Send receipt</Text>
              <Text style={styles.actionValue}>Email</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionChip}>
              <Text style={styles.actionLabel}>Request testimonial</Text>
              <Text style={styles.actionValue}>Email</Text>
            </TouchableOpacity>
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
                <Text style={[styles.statusText, { color: client.statusColor }]}>
                  {client.status}
                </Text>
              </View>
            </View>
          ))}
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
          <Text style={styles.sectionTitle}>Emails & receipts</Text>
          <Text style={styles.sectionBody}>
            Send receipts, check delivery, and invite testimonials without leaving Becky CRM.
          </Text>
          <TouchableOpacity style={styles.primaryButton}>
            <Text style={styles.primaryText}>Send receipt</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Calendar sync</Text>
          <Text style={styles.sectionBody}>
            Optional links to Google or Notion calendars keep every appointment aligned. Sync once and let Becky handle the rest.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#04080f',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 16,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#fdfdfd',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: '#bac6ff',
    maxWidth: '85%',
  },
  scrollArea: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#111720',
    borderRadius: 24,
    padding: 20,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 6,
  },
  sectionTitle: {
    color: '#f5f7ff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionChip: {
    width: '48%',
    backgroundColor: '#1b2230',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  actionLabel: {
    color: '#d8e2ff',
    fontWeight: '600',
  },
  actionValue: {
    marginTop: 6,
    color: '#93a0c4',
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
});
