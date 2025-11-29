import React from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import ClientPage from './components/ClientPage';
import AccountSettingsPanel from './components/AccountSettingsPanel';
import ActivityLogPanel from './components/ActivityLogPanel';
import { useFonts, SpaceGrotesk_600SemiBold } from '@expo-google-fonts/space-grotesk';

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
  const [fontsLoaded] = useFonts({
    'lores-9-wide': SpaceGrotesk_600SemiBold,
  });
  const [menuVisible, setMenuVisible] = React.useState(false);
  const [notificationsVisible, setNotificationsVisible] = React.useState(false);
  const [activityVisible, setActivityVisible] = React.useState(false);
  const [settingsVisible, setSettingsVisible] = React.useState(false);
  const [preferencesVisible, setPreferencesVisible] = React.useState(false);
  const [accountDropdownVisible, setAccountDropdownVisible] = React.useState(false);

  if (!fontsLoaded) {
    return null;
  }

  const closeAll = () => {
    setMenuVisible(false);
    setNotificationsVisible(false);
    setActivityVisible(false);
    setSettingsVisible(false);
    setPreferencesVisible(false);
    setAccountDropdownVisible(false);
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
            onPress={() => setAccountDropdownVisible(!accountDropdownVisible)}
          >
            <Feather name="user" size={18} color="#c4cff6" />
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
        {accountDropdownVisible && (
          <View style={styles.accountDropdown}>
            <TouchableOpacity style={styles.accountDropdownItem}>
              <Text style={styles.accountDropdownText}>Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.accountDropdownItem}
              onPress={() => {
                setAccountDropdownVisible(false);
                setPreferencesVisible(true);
              }}
            >
              <Text style={styles.accountDropdownText}>Preferences</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.accountDropdownItem}>
              <Text style={styles.accountDropdownText}>Sign out</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ClientPage onOpenPreferences={() => setPreferencesVisible(true)} />

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
        <View style={styles.activityModal}>
          <ActivityLogPanel />
        </View>
      </Modal>

      <Modal transparent visible={settingsVisible} animationType="slide">
        <Pressable style={styles.modalBackdrop} onPress={closeAll} />
        <View style={styles.accountModal}>
          <AccountSettingsPanel
            onClose={() => {
              setSettingsVisible(false);
              setPreferencesVisible(false);
            }}
          />
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
    position: 'relative',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f5f6ff',
    fontFamily: 'lores-9-wide',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#9cb3ff',
    maxWidth: '80%',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
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
  accountDropdown: {
    position: 'absolute',
    right: 24,
    top: 72,
    backgroundColor: '#101427',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#1f2335',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  accountDropdownItem: {
    paddingVertical: 6,
  },
  accountDropdownText: {
    color: '#c5cff9',
    fontSize: 13,
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
  accountModal: {
    marginHorizontal: 18,
    marginTop: 110,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1f2335',
  },
  activityModal: {
    marginHorizontal: 18,
    marginTop: 110,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1f2335',
  },
});
