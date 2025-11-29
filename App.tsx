import { StatusBar } from 'expo-status-bar';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';

const quickActions = [
  { id: 'notes', label: 'Add client note' },
  { id: 'task', label: 'Schedule follow-up' },
  { id: 'receipt', label: 'Send receipt' },
  { id: 'testimonial', label: 'Request testimonial' },
];

const clients = [
  { name: 'Woodgreen Landscaping', next: 'Call about invoice', status: 'On track' },
  { name: 'Marina Studio', next: 'Confirm testimonial', status: 'Reminder' },
  { name: 'Sammy Creative', next: 'Share gallery updates', status: 'Sent' },
];

const timeline = [
  { id: '1', text: 'Appointment added to calendar', time: '08:30' },
  { id: '2', text: 'Receipt sent for Marcia event', time: 'Yesterday' },
  { id: '3', text: 'Testimonial requested via email', time: '2d ago' },
];

export default function App() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.title}>Becky CRM</Text>
        <Text style={styles.subTitle}>Client knowledge in every tap</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollArea}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Quick actions</Text>
          <View style={styles.actionsRow}>
            {quickActions.map((action) => (
              <TouchableOpacity key={action.id} style={styles.actionButton}>
                <Text style={styles.actionText}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Clients</Text>
          {clients.map((client) => (
            <View key={client.name} style={styles.clientRow}>
              <View>
                <Text style={styles.clientName}>{client.name}</Text>
                <Text style={styles.clientNext}>{client.next}</Text>
              </View>
              <View style={styles.clientStatus}>
                <Text style={styles.statusText}>{client.status}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          {timeline.map((event) => (
            <View key={event.id} style={styles.timelineRow}>
              <Text style={styles.timelineTime}>{event.time}</Text>
              <Text style={styles.timelineText}>{event.text}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Emails & receipts</Text>
          <Text style={styles.sectionBody}>
            Send receipts and testimonial requests, and review delivery status without leaving the app.
          </Text>
          <TouchableOpacity style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Send receipt</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Calendar sync</Text>
          <Text style={styles.sectionBody}>
            Optional connections with Google or Notion calendars keep appointments aligned across your tools.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#040811',
  },
  header: {
    paddingTop: 32,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fefefe',
  },
  subTitle: {
    marginTop: 4,
    fontSize: 16,
    color: '#aec3ff',
  },
  scrollArea: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  sectionCard: {
    backgroundColor: '#111720',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f6f7fb',
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1f2835',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  actionText: {
    color: '#d0d7f2',
    fontSize: 13,
    fontWeight: '500',
  },
  clientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fefefe',
  },
  clientNext: {
    fontSize: 13,
    color: '#9aa5c4',
  },
  clientStatus: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#5c93ff',
  },
  statusText: {
    color: '#5c93ff',
    fontSize: 12,
    fontWeight: '500',
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  timelineTime: {
    width: 60,
    fontSize: 12,
    color: '#7ba1ff',
  },
  timelineText: {
    fontSize: 14,
    color: '#f1f4ff',
  },
  sectionBody: {
    fontSize: 14,
    color: '#b0b7d8',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#5c93ff',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#0e1420',
    fontWeight: '700',
    fontSize: 14,
  },
});
