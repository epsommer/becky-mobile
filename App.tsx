import React from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { MaterialIcons, Feather } from '@expo/vector-icons';

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
  { text: 'Appointment synced with Google Calendar', label: 'Calendar' },
  { text: 'Receipt emailed for Marcia event', label: 'Receipt' },
  { text: 'Testimonial requested via email', label: 'Email' },
];

const navigationLinks = [
  'Dashboard',
  'Clients',
  'Conversations',
  'Testimonials',
  'Billing',
  'Time Manager',
  'Goals',
  'Service Lines',
];

const notifications = [
  { id: '1', title: 'New message from Marina Studio', time: '2m ago' },
  { id: '2', title: 'Receipt delivered to Woodgreen', time: '1h ago' },
  { id: '3', title: 'Testimonial requested', time: 'Yesterday' },
];

const activityLog = [
  'Signed in on iPhone 15 Pro (Toronto)',
  'Connected Google Calendar sync',
  'Set preferences: compact mode enabled',
];

export default function App() {
  const [menuVisible, setMenuVisible] = React.useState(false);
  const [notificationsVisible, setNotificationsVisible] = React.useState(false);
  const [activityVisible, setActivityVisible] = React.useState(false);
  const [settingsVisible, setSettingsVisible] = React.useState(false);
  const [preferencesVisible, setPreferencesVisible] = React.useState(false);

  const closeAll = () => {
    setMenuVisible(false);
    setNotificationsVisible(false);
    setActivityVisible(false);
    setSettingsVisible(false);
    setPreferencesVisible(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setMenuVisible(true)}
        >
          <MaterialIcons name="menu" size={22} color="#bac6ff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>B.E.C.K.Y. CRM</Text>
          <Text style={styles.subtitle}>
            Mobile mirror of the web dashboard with neomorphic polish
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setNotificationsVisible(true)}
          >
            <Feather name="bell" size={20} color="#c4cff6" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setActivityVisible(true)}
          >
            <MaterialIcons name="timeline" size={20} color="#c4cff6" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.avatar}
            onPress={() => setSettingsVisible(true)}
          >
            <Text style={styles.avatarText}>ES</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollArea}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.navRow}>
          {navigationLinks.map((link) => (
            <TouchableOpacity key={link} style={styles.navChip}>
              <Text style={styles.navChipText}>{link}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Quick actions</Text>
          <View style={styles.actionsGrid}>
            {[
              { label: 'Add note', meta: 'Clients' },
              { label: 'Create task', meta: 'Follow-up' },
              { label: 'Send receipt', meta: 'Email' },
              { label: 'Request testimonial', meta: 'Email' },
            ].map((action) => (
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
        </View>
      </ScrollView>

      <Modal transparent visible={menuVisible} animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={closeAll} />
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Navigation</Text>
          {navigationLinks.map((link) => (
            <Text key={link} style={styles.modalItem}>
              {link}
            </Text>
          ))}
        </View>
      </Modal>

      <Modal transparent visible={notificationsVisible} animationType="slide">
        <Pressable style={styles.modalBackdrop} onPress={closeAll} />
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Notifications</Text>
          {notifications.map((note) => (
            <Text key={note.id} style={styles.modalItem}>
              {note.title} · {note.time}
            </Text>
          ))}
        </View>
      </Modal>

      <Modal transparent visible={activityVisible} animationType="slide">
        <Pressable style={styles.modalBackdrop} onPress={closeAll} />
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Activity Log</Text>
          {activityLog.map((entry) => (
            <Text key={entry} style={styles.modalItem}>
              {entry}
            </Text>
          ))}
        </View>
      </Modal>

      <Modal transparent visible={settingsVisible} animationType="slide">
        <Pressable style={styles.modalBackdrop} onPress={closeAll} />
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Account settings</Text>
          <Text style={styles.modalItem}>Evangelo Sommer</Text>
          <Text style={styles.modalItem}>support@evangelosommer.com</Text>
          <TouchableOpacity
            style={styles.modalButton}
            onPress={() => {
              setSettingsVisible(false)
              setPreferencesVisible(true)
            }}
          >
            <Text style={styles.modalButtonText}>Preferences</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal transparent visible={preferencesVisible} animationType="slide">
        <Pressable style={styles.modalBackdrop} onPress={closeAll} />
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Preferences</Text>
          <Text style={styles.modalItem}>Theme: Neomorphic / Tactical</Text>
          <Text style={styles.modalItem}>Grain: Medium</Text>
          <Text style={styles.modalItem}>Window: Neomorphic</Text>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#020412',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f5f6ff',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#9cb3ff',
    maxWidth: '80%',
  },
  headerBadge: {
    backgroundColor: '#1f2436',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  badgeLabel: {
    color: '#9cb3ff',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  badgeValue: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  menuButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#111720',
    borderWidth: 1,
    borderColor: '#1f2435',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#111720',
    borderWidth: 1,
    borderColor: '#1b1f30',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1b1f30',
    backgroundColor: '#2a2f44',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  avatarText: {
    color: '#f4f6ff',
    fontWeight: '700',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    marginHorizontal: 28,
    marginTop: 120,
    backgroundColor: '#0d111f',
    borderRadius: 28,
    padding: 20,
    borderColor: '#1f2435',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 25,
    elevation: 10,
  },
  modalTitle: {
    color: '#f8fbff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  modalItem: {
    color: '#c7d1ef',
    fontSize: 14,
    paddingVertical: 8,
  },
  modalButton: {
    marginTop: 16,
    backgroundColor: '#5c93ff',
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#0f1622',
    fontWeight: '600',
  },
});
