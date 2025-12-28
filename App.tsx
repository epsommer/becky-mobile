import React, { useEffect, useState, useCallback, useRef } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, StyleSheet, Text, View, TouchableOpacity, Modal, Pressable, ActivityIndicator, Animated } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import AccountSettingsPanel from "./components/AccountSettingsPanel";
import ActivityLogPanel from "./components/ActivityLogPanel";
import PreferencesPanel from "./components/PreferencesPanel";
import SidebarPanel from "./components/SidebarPanel";
import NotificationsModalPanel from "./components/NotificationsModalPanel";
import UserAvatarDropdownPanel from "./components/UserAvatarDropdownPanel";
import DashboardScreen from "./components/screens/DashboardScreen";
import ClientsScreen from "./components/screens/ClientsScreen";
import ClientDetailScreen from "./components/screens/ClientDetailScreen";
import ConversationsScreen from "./components/screens/ConversationsScreen";
import ConversationDetailScreen from "./components/screens/ConversationDetailScreen";
import MasterTimelineDetailScreen from "./components/screens/MasterTimelineDetailScreen";
import SmsMessagesScreen from "./components/screens/SmsMessagesScreen";
import TestimonialsScreen from "./components/screens/TestimonialsScreen";
import BillingScreen from "./components/screens/BillingScreen";
import TimeManagerScreen from "./components/screens/TimeManagerScreen";
import GoalsScreen from "./components/screens/GoalsScreen";
import ServiceLinesScreen from "./components/screens/ServiceLinesScreen";
import ContactsListScreen from "./components/screens/ContactsListScreen";
import AnalyticsDashboardScreen from "./components/screens/AnalyticsDashboardScreen";
import SettingsScreen from "./components/screens/SettingsScreen";
import FollowUpDashboardScreen from "./components/screens/FollowUpDashboardScreen";
import { useFonts } from "expo-font";
import { Ionicons } from "@expo/vector-icons";
import NeomorphicCard from "./components/NeomorphicCard";
import { ThemeProvider, ThemeTokens, useTheme } from "./theme/ThemeContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CalendarProvider } from "./context/CalendarContext";
import { NotificationProvider } from "./context/NotificationContext";
import { NotificationNavigationAction } from "./hooks/useNotifications";
import LoginScreen from "./screens/LoginScreen";
import * as NavigationBar from "expo-navigation-bar";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

type PageKey =
  | "Dashboard"
  | "Analytics"
  | "Clients"
  | "Conversations"
  | "Testimonials"
  | "Billing"
  | "Time Manager"
  | "Goals"
  | "Service Lines"
  | "Follow-ups"
  | "Settings";

const navigationLinks: PageKey[] = [
  "Dashboard",
  "Analytics",
  "Clients",
  "Conversations",
  "Testimonials",
  "Billing",
  "Time Manager",
  "Goals",
  "Service Lines",
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
  console.log('[App] ===== APP COMPONENT RENDERING =====');

  try {
    return (
      <ThemeProvider>
        <AuthProvider>
          <AuthGate />
        </AuthProvider>
      </ThemeProvider>
    );
  } catch (error) {
    console.error('[App] Error rendering app:', error);
    return (
      <View style={{ flex: 1, backgroundColor: '#ff0000', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#ffffff' }}>Error: {String(error)}</Text>
      </View>
    );
  }
}

/**
 * AuthGate: Shows LoginScreen, success animation, or main app
 */
function AuthGate() {
  console.log('[AuthGate] Component rendering');
  const { isAuthenticated, loading, checkAuth } = useAuth();
  const { tokens } = useTheme();
  const [showSuccess, setShowSuccess] = useState(false);
  const [fadeAnim] = useState(() => new Animated.Value(0));

  console.log('[AuthGate] Auth state:', { isAuthenticated, loading, showSuccess });

  // Hide splash screen when auth check completes
  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync();
      console.log('[AuthGate] Splash screen hidden');
    }
  }, [loading]);

  // Handle success animation transition
  useEffect(() => {
    if (showSuccess) {
      // Fade in the checkmark
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        // After showing checkmark, fade out and proceed to app
        setTimeout(() => {
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            setShowSuccess(false);
          });
        }, 800);
      });
    }
  }, [showSuccess, fadeAnim]);

  // Show loading spinner while checking stored auth
  if (loading) {
    console.log('[AuthGate] Showing loading spinner');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: tokens.background }}>
        <ActivityIndicator size="large" color={tokens.accent} />
        <Text style={{ marginTop: 16, color: tokens.textSecondary, fontSize: 14 }}>
          Loading...
        </Text>
      </View>
    );
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    console.log('[AuthGate] Not authenticated, showing LoginScreen');
    return <LoginScreen onLoginSuccess={async () => {
      console.log('[AuthGate] Login success, showing success animation...');
      setShowSuccess(true);
      await checkAuth();
      console.log('[AuthGate] Auth checked');
    }} />;
  }

  // Show success checkmark animation briefly after login
  if (showSuccess) {
    console.log('[AuthGate] Showing success animation');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: tokens.background }}>
        <Animated.View style={{ opacity: fadeAnim }}>
          <Ionicons name="checkmark-circle" size={72} color={tokens.accent} />
        </Animated.View>
      </View>
    );
  }

  // Show the full app
  console.log('[AuthGate] Authenticated, showing ThemedApp');
  return (
    <CalendarProvider>
      <NotificationProvider>
        <ThemedApp />
      </NotificationProvider>
    </CalendarProvider>
  );
}

function ThemedApp() {
  console.log('[ThemedApp] Component rendering');
  const { logout, user } = useAuth();
  const [fontsLoaded] = useFonts({
    PressStart2P: require("./assets/fonts/Press_Start_2P/PressStart2P-Regular.ttf"),
    "Bytesized-Regular": require("./assets/fonts/Bytesized/Bytesized-Regular.ttf"),
    "Tiny5-Regular": require("./assets/fonts/Tiny5/Tiny5-Regular.ttf"),
    // Temporarily using Tiny5 for lores-9-wide until SpaceGrotesk issue is resolved
    "lores-9-wide": require("./assets/fonts/Tiny5/Tiny5-Regular.ttf"),
  });
  const [menuVisible, setMenuVisible] = React.useState(false);
  const [notificationsVisible, setNotificationsVisible] = React.useState(false);
  const [activityVisible, setActivityVisible] = React.useState(false);
  const [settingsVisible, setSettingsVisible] = React.useState(false);
  const [preferencesVisible, setPreferencesVisible] = React.useState(false);
  const [accountDropdownVisible, setAccountDropdownVisible] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState<PageKey>("Dashboard");
  const [selectedClientId, setSelectedClientId] = React.useState<string | null>(null);
  const [showContactsList, setShowContactsList] = React.useState(false);
  const [showSmsMessages, setShowSmsMessages] = React.useState(false);
  const [selectedConversationId, setSelectedConversationId] = React.useState<string | null>(null);
  const [selectedMasterClientId, setSelectedMasterClientId] = React.useState<string | null>(null);
  const { tokens, windowTheme } = useTheme();
  const styles = React.useMemo(() => createStyles(tokens), [tokens]);

  console.log('[ThemedApp] Fonts loaded:', fontsLoaded);

  // Note: Splash screen is now hidden in AuthGate when auth check completes

  useEffect(() => {
    const darkMode = windowTheme === "tactical";
    const barColor = darkMode ? "#05060c" : "transparent";
    const buttonStyle = darkMode ? "light" : "dark";

    const syncNavBar = async () => {
      try {
        await NavigationBar.setBackgroundColorAsync(barColor, true);
        await NavigationBar.setButtonStyleAsync(buttonStyle);
      } catch (error) {
        console.warn("[NavigationBar] failed to set color", error);
      }
    };

    syncNavBar();
  }, [windowTheme]);

  if (!fontsLoaded) {
    console.log('[ThemedApp] Waiting for fonts to load...');
    return null;
  }

  console.log('[ThemedApp] Fonts loaded, rendering UI');

  const closeAll = () => {
    setMenuVisible(false);
    setNotificationsVisible(false);
    setActivityVisible(false);
    setSettingsVisible(false);
    setPreferencesVisible(false);
    setAccountDropdownVisible(false);
    setMenuVisible(false);
  };

  const handlePageSelect = (page: PageKey) => {
    setCurrentPage(page);
    setSelectedClientId(null); // Clear client selection when changing pages
    setShowContactsList(false);
    setShowSmsMessages(false);
    setSelectedConversationId(null);
    setSelectedMasterClientId(null);
    closeAll();
  };

  const handleViewClientDetail = (clientId: string) => {
    setSelectedClientId(clientId);
    setCurrentPage("Clients");
    closeAll();
  };

  const handleBackFromClientDetail = () => {
    setSelectedClientId(null);
  };

  const renderPage = () => {
    // Show contacts list screen
    if (showContactsList) {
      return (
        <ContactsListScreen
          onBack={() => setShowContactsList(false)}
          onBatchAction={(selectedIds) => {
            console.log('[ThemedApp] Batch action with:', selectedIds.length, 'contacts');
            // TODO: Implement batch create clients
          }}
        />
      );
    }

    // Show SMS messages screen
    if (showSmsMessages) {
      return (
        <SmsMessagesScreen
          onBack={() => setShowSmsMessages(false)}
          onSelectThread={(threadId) => {
            console.log('[ThemedApp] Selected SMS thread:', threadId);
            // TODO: Navigate to thread detail view
          }}
        />
      );
    }

    // Show conversation detail screen
    if (selectedConversationId) {
      return (
        <ConversationDetailScreen
          conversationId={selectedConversationId}
          onBack={() => setSelectedConversationId(null)}
        />
      );
    }

    // Show master timeline detail screen
    if (selectedMasterClientId) {
      return (
        <MasterTimelineDetailScreen
          clientId={selectedMasterClientId}
          onBack={() => setSelectedMasterClientId(null)}
          onConversationSelect={(convId) => {
            setSelectedMasterClientId(null);
            setSelectedConversationId(convId);
          }}
        />
      );
    }

    // Show client detail screen if a client is selected
    if (selectedClientId) {
      return (
        <ClientDetailScreen
          clientId={selectedClientId}
          onBack={handleBackFromClientDetail}
        />
      );
    }

    switch (currentPage) {
      case "Dashboard":
        return (
          <DashboardScreen
            onOpenPreferences={() => setPreferencesVisible(true)}
            onNavigateToClients={() => handlePageSelect("Clients")}
            onViewClientDetail={handleViewClientDetail}
          />
        );
      case "Analytics":
        return <AnalyticsDashboardScreen />;
      case "Clients":
        return (
          <ClientsScreen
            onViewClientDetail={handleViewClientDetail}
            onViewContacts={() => setShowContactsList(true)}
          />
        );
      case "Conversations":
        return (
          <ConversationsScreen
            onViewSmsMessages={() => setShowSmsMessages(true)}
            onViewConversation={(convId) => setSelectedConversationId(convId)}
            onViewMasterTimeline={(clientId) => setSelectedMasterClientId(clientId)}
          />
        );
      case "Testimonials":
        return <TestimonialsScreen />;
      case "Billing":
        return <BillingScreen />;
      case "Time Manager":
        return <TimeManagerScreen />;
      case "Goals":
        return <GoalsScreen />;
      case "Service Lines":
        return <ServiceLinesScreen />;
      case "Follow-ups":
        return (
          <FollowUpDashboardScreen
            onViewClient={handleViewClientDetail}
          />
        );
      case "Settings":
        return (
          <SettingsScreen
            onBack={() => handlePageSelect("Dashboard")}
          />
        );
      default:
        return (
          <DashboardScreen
            onOpenPreferences={() => setPreferencesVisible(true)}
            onNavigateToClients={() => handlePageSelect("Clients")}
          />
        );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => {
            closeAll();
            setMenuVisible(true);
          }}
        >
          <Ionicons name="menu" size={18} color={tokens.accent} />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>B.E.C.K.Y.</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setNotificationsVisible(true)}
          >
            <Ionicons name="notifications" size={16} color={tokens.accent} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.avatar}
            onPress={() => setAccountDropdownVisible(!accountDropdownVisible)}
          >
            <Text style={styles.avatarText}>
              {user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'ES'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal transparent visible={accountDropdownVisible} animationType="none">
        <View style={styles.dropdownLayer}>
          <Pressable
            style={[
              styles.dropdownBackdrop,
              {
                backgroundColor:
                  windowTheme === "tactical" ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.35)",
              },
            ]}
            onPress={closeAll}
          />
          <UserAvatarDropdownPanel
            onAccountSettings={() => {
              setAccountDropdownVisible(false);
              handlePageSelect("Settings");
            }}
            onPreferences={() => {
              setAccountDropdownVisible(false);
              handlePageSelect("Settings");
            }}
            onActivityLog={() => {
              setAccountDropdownVisible(false);
              setActivityVisible(true);
            }}
            onSignOut={async () => {
              setAccountDropdownVisible(false);
              await logout();
            }}
          />
        </View>
      </Modal>

      {renderPage()}

      <Modal transparent visible={menuVisible} animationType="fade">
        <Pressable style={[styles.modalBackdrop, { backgroundColor: windowTheme === "tactical" ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.4)" }]} onPress={closeAll} />
        <View style={styles.menuWrapper}>
          <NeomorphicCard
            style={[styles.modalCard, styles.menuModalCard]}
            contentStyle={styles.modalContent}
            darkOffset={[18, 6]}
            lightOffset={[-3, -3]}
            darkDistance={12}
            lightDistance={10}
          >
            <SidebarPanel
              onSelect={(tab) => handlePageSelect(tab as PageKey)}
              onClose={() => setMenuVisible(false)}
            />
          </NeomorphicCard>
        </View>
      </Modal>

      <Modal transparent visible={notificationsVisible} animationType="slide">
        <Pressable style={[styles.modalBackdrop, { backgroundColor: windowTheme === "tactical" ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.4)" }]} onPress={closeAll} />
        <NeomorphicCard style={styles.modalCard} contentStyle={styles.notificationsModal}>
          <NotificationsModalPanel />
        </NeomorphicCard>
      </Modal>

      <Modal transparent visible={activityVisible} animationType="slide">
        <Pressable style={[styles.modalBackdrop, { backgroundColor: windowTheme === "tactical" ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.4)" }]} onPress={closeAll} />
        <NeomorphicCard style={styles.modalCard} contentStyle={styles.activityModal}>
          <ActivityLogPanel />
        </NeomorphicCard>
      </Modal>

      <Modal transparent visible={settingsVisible} animationType="slide">
        <Pressable style={[styles.modalBackdrop, { backgroundColor: windowTheme === "tactical" ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.4)" }]} onPress={closeAll} />
        <View style={styles.accountModalLayer}>
          <NeomorphicCard style={[styles.modalCard, styles.accountModalCard]} contentStyle={styles.accountModal}>
            <AccountSettingsPanel
              onClose={() => {
                setSettingsVisible(false);
                setPreferencesVisible(false);
              }}
            />
          </NeomorphicCard>
        </View>
      </Modal>

      <Modal transparent visible={preferencesVisible} animationType="slide">
        <Pressable style={[styles.modalBackdrop, { backgroundColor: windowTheme === "tactical" ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.4)" }]} onPress={closeAll} />
        <NeomorphicCard style={styles.modalCard} contentStyle={styles.preferencesModal}>
          <PreferencesPanel onClose={closeAll} />
        </NeomorphicCard>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
  safeArea: {
      flex: 1,
      backgroundColor: tokens.background,
      position: "relative",
    },
    header: {
      paddingHorizontal: 24,
      paddingTop: 32,
      paddingBottom: 14,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      position: "relative",
      backgroundColor: tokens.background,
    },
    title: {
      fontSize: 16,
      color: tokens.textPrimary,
      fontFamily: "PressStart2P",
      letterSpacing: 0,
      lineHeight: 18,
    },
    titleContainer: {
      flex: 1,
      marginRight: 12,
    },
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
    },
    menuButton: {
      width: 34,
      height: 34,
      borderRadius: 12,
      backgroundColor: tokens.surface,
      borderWidth: 1,
      borderColor: tokens.border,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    iconButton: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: tokens.surface,
      borderWidth: 1,
      borderColor: tokens.border,
      justifyContent: "center",
      alignItems: "center",
      marginLeft: 6,
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: tokens.accent,
      backgroundColor: tokens.surface,
      shadowColor: tokens.shadowDark,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.45,
      shadowRadius: 8,
      elevation: 6,
      justifyContent: "center",
      alignItems: "center",
      marginLeft: 6,
    },
    avatarText: {
      color: tokens.textPrimary,
      fontWeight: "700",
    },
    modalBackdrop: {
      ...StyleSheet.absoluteFillObject,
    },
    menuModalBackdrop: {
      ...StyleSheet.absoluteFillObject,
    },
    modalCard: {
      marginHorizontal: 18,
      marginTop: 110,
      borderRadius: 24,
    },
    menuModalCard: {
      marginTop: 4,
      marginLeft: 16,
    },
    menuWrapper: {
      marginTop: 66,
      marginLeft: 14,
    },
    accountModalCard: {
      marginTop: 0,
    },
    accountModalLayer: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 18,
    },
    modalContent: {
      padding: 20,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    accountModal: {
      padding: 0,
      borderRadius: 20,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: tokens.border,
    },
    activityModal: {
      padding: 0,
      borderRadius: 20,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: tokens.border,
    },
    preferencesModal: {
      padding: 0,
      borderRadius: 24,
      overflow: "hidden",
    },
    notificationsModal: {
      padding: 0,
      borderRadius: 24,
      overflow: "hidden",
    },
    dropdownBackdrop: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 45,
      elevation: 20,
    },
    dropdownLayer: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 60,
      elevation: 45,
      justifyContent: "flex-start",
      alignItems: "flex-end",
      paddingTop: 70,
      paddingRight: 24,
    },
  });
