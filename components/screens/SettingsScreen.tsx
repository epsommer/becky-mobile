"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  Alert,
  Linking,
  Platform,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import { ThemeTokens, ColorTheme, WindowTheme, GrainIntensity, useTheme } from "../../theme/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import NeomorphicCard from "../NeomorphicCard";

interface SettingsScreenProps {
  onBack: () => void;
}

type SettingsTab = "profile" | "security" | "calendar" | "notifications" | "theme" | "privacy" | "about";

interface CalendarPreferences {
  defaultView: "day" | "week" | "month";
  timeFormat: "12h" | "24h";
  weekStartDay: "sunday" | "monday";
  workingHoursStart: number;
  workingHoursEnd: number;
}

interface NotificationPreferences {
  pushEnabled: boolean;
  emailEnabled: boolean;
  reminderMinutes: number;
  dailyDigest: boolean;
}

const STORAGE_KEYS = {
  calendarPrefs: "calendar-preferences",
  notificationPrefs: "notification-preferences",
  biometricEnabled: "biometric-enabled",
};

const colorThemes: { id: ColorTheme; label: string; desc: string }[] = [
  { id: "light", label: "Light", desc: "Soft neutral" },
  { id: "mocha", label: "Mocha", desc: "Warm dark" },
  { id: "overkast", label: "Overkast", desc: "Monochrome" },
  { id: "true-night", label: "True Night", desc: "Deep neutral" },
  { id: "gilded-meadow", label: "Gilded Meadow", desc: "Sunkissed" },
];

const windowThemes: { id: WindowTheme; label: string; desc: string }[] = [
  { id: "neomorphic", label: "Neomorphic", desc: "3D glass-shell" },
  { id: "tactical", label: "Tactical", desc: "HUD dark steel" },
];

const grainLevels: { id: GrainIntensity; label: string }[] = [
  { id: "off", label: "Off" },
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
];

export default function SettingsScreen({ onBack }: SettingsScreenProps) {
  const { tokens, colorTheme, windowTheme, grainIntensity, setColorTheme, setWindowTheme, setGrainIntensity } = useTheme();
  const { user, logout } = useAuth();
  const styles = React.useMemo(() => createStyles(tokens), [tokens]);

  // State
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [loading, setLoading] = useState(false);

  // Profile state
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState(user?.name || "");
  const [profileEmail, setProfileEmail] = useState(user?.email || "");
  const [businessName, setBusinessName] = useState("");

  // Security state
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  // Calendar preferences
  const [calendarPrefs, setCalendarPrefs] = useState<CalendarPreferences>({
    defaultView: "week",
    timeFormat: "12h",
    weekStartDay: "sunday",
    workingHoursStart: 9,
    workingHoursEnd: 17,
  });

  // Notification preferences
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>({
    pushEnabled: true,
    emailEnabled: true,
    reminderMinutes: 15,
    dailyDigest: false,
  });

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const [calendarData, notificationData, biometricData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.calendarPrefs),
        AsyncStorage.getItem(STORAGE_KEYS.notificationPrefs),
        AsyncStorage.getItem(STORAGE_KEYS.biometricEnabled),
      ]);

      if (calendarData) {
        setCalendarPrefs(JSON.parse(calendarData));
      }
      if (notificationData) {
        setNotificationPrefs(JSON.parse(notificationData));
      }
      if (biometricData) {
        setBiometricEnabled(biometricData === "true");
      }
    } catch (error) {
      console.error("[SettingsScreen] Error loading preferences:", error);
    }
  };

  const saveCalendarPrefs = async (newPrefs: CalendarPreferences) => {
    setCalendarPrefs(newPrefs);
    await AsyncStorage.setItem(STORAGE_KEYS.calendarPrefs, JSON.stringify(newPrefs));
  };

  const saveNotificationPrefs = async (newPrefs: NotificationPreferences) => {
    setNotificationPrefs(newPrefs);
    await AsyncStorage.setItem(STORAGE_KEYS.notificationPrefs, JSON.stringify(newPrefs));
  };

  const saveBiometric = async (enabled: boolean) => {
    setBiometricEnabled(enabled);
    await AsyncStorage.setItem(STORAGE_KEYS.biometricEnabled, enabled.toString());
  };

  // Handlers
  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      // TODO: API call to update profile
      Alert.alert("Success", "Profile updated successfully");
      setEditingProfile(false);
    } catch (error) {
      Alert.alert("Error", "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = () => {
    Alert.alert(
      "Change Password",
      "You will receive an email with instructions to reset your password.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send Email",
          onPress: () => {
            // TODO: API call to request password reset
            Alert.alert("Email Sent", "Check your inbox for password reset instructions.");
          },
        },
      ]
    );
  };

  const handleExportData = () => {
    Alert.alert(
      "Export Data",
      "Your data export will be prepared and sent to your email address.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Export",
          onPress: () => {
            // TODO: API call to request data export
            Alert.alert("Export Started", "You will receive an email with your data shortly.");
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This action is permanent and cannot be undone. All your data will be deleted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Confirm Deletion",
              "Are you absolutely sure? Type 'DELETE' to confirm.",
              [{ text: "Cancel", style: "cancel" }]
            );
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const handleSupport = () => {
    Linking.openURL("mailto:support@evangelosommer.com");
  };

  const handlePrivacyPolicy = () => {
    Linking.openURL("https://evangelosommer.com/privacy");
  };

  const handleTermsOfService = () => {
    Linking.openURL("https://evangelosommer.com/terms");
  };

  // Tab navigation items
  const tabs: { id: SettingsTab; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
    { id: "profile", icon: "person-outline", label: "Profile" },
    { id: "security", icon: "shield-outline", label: "Security" },
    { id: "calendar", icon: "calendar-outline", label: "Calendar" },
    { id: "notifications", icon: "notifications-outline", label: "Alerts" },
    { id: "theme", icon: "color-palette-outline", label: "Theme" },
    { id: "privacy", icon: "lock-closed-outline", label: "Privacy" },
    { id: "about", icon: "information-circle-outline", label: "About" },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "profile":
        return renderProfileTab();
      case "security":
        return renderSecurityTab();
      case "calendar":
        return renderCalendarTab();
      case "notifications":
        return renderNotificationsTab();
      case "theme":
        return renderThemeTab();
      case "privacy":
        return renderPrivacyTab();
      case "about":
        return renderAboutTab();
      default:
        return null;
    }
  };

  const renderProfileTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Profile Information</Text>

      <NeomorphicCard style={styles.card} contentStyle={styles.cardContent}>
        {editingProfile ? (
          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={[styles.input, { color: tokens.textPrimary, borderColor: tokens.border }]}
              value={profileName}
              onChangeText={setProfileName}
              placeholder="Enter your name"
              placeholderTextColor={tokens.textSecondary}
            />

            <Text style={[styles.inputLabel, { marginTop: 16 }]}>Email</Text>
            <TextInput
              style={[styles.input, { color: tokens.textPrimary, borderColor: tokens.border }]}
              value={profileEmail}
              onChangeText={setProfileEmail}
              placeholder="Enter your email"
              placeholderTextColor={tokens.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={[styles.inputLabel, { marginTop: 16 }]}>Business Name</Text>
            <TextInput
              style={[styles.input, { color: tokens.textPrimary, borderColor: tokens.border }]}
              value={businessName}
              onChangeText={setBusinessName}
              placeholder="Enter your business name"
              placeholderTextColor={tokens.textSecondary}
            />

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary, { borderColor: tokens.border }]}
                onPress={() => setEditingProfile(false)}
              >
                <Text style={[styles.buttonText, { color: tokens.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary, { backgroundColor: tokens.accent }]}
                onPress={handleSaveProfile}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={tokens.background} />
                ) : (
                  <Text style={[styles.buttonText, { color: tokens.background }]}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View>
            <View style={styles.infoRow}>
              <View style={styles.avatarLarge}>
                <Text style={styles.avatarTextLarge}>
                  {user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "ES"}
                </Text>
              </View>
              <View style={styles.infoDetails}>
                <Text style={styles.profileName}>{user?.name || "User"}</Text>
                <Text style={styles.profileEmail}>{user?.email || "email@example.com"}</Text>
                {user?.role && <Text style={styles.profileRole}>{user.role}</Text>}
              </View>
            </View>
            <TouchableOpacity
              style={[styles.editButton, { borderColor: tokens.accent }]}
              onPress={() => setEditingProfile(true)}
            >
              <Ionicons name="pencil-outline" size={16} color={tokens.accent} />
              <Text style={[styles.editButtonText, { color: tokens.accent }]}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        )}
      </NeomorphicCard>
    </View>
  );

  const renderSecurityTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Security Settings</Text>

      <NeomorphicCard style={styles.card} contentStyle={styles.cardContent}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Ionicons name="finger-print-outline" size={24} color={tokens.accent} />
            <View style={styles.settingText}>
              <Text style={styles.settingLabel}>Biometric Login</Text>
              <Text style={styles.settingDesc}>Use Face ID or fingerprint to sign in</Text>
            </View>
          </View>
          <Switch
            value={biometricEnabled}
            onValueChange={saveBiometric}
            trackColor={{ false: tokens.border, true: tokens.accent }}
            thumbColor={tokens.surface}
          />
        </View>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.settingRow} onPress={handleChangePassword}>
          <View style={styles.settingInfo}>
            <Ionicons name="key-outline" size={24} color={tokens.accent} />
            <View style={styles.settingText}>
              <Text style={styles.settingLabel}>Change Password</Text>
              <Text style={styles.settingDesc}>Update your account password</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={tokens.textSecondary} />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Ionicons name="phone-portrait-outline" size={24} color={tokens.accent} />
            <View style={styles.settingText}>
              <Text style={styles.settingLabel}>Active Sessions</Text>
              <Text style={styles.settingDesc}>1 active session on this device</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={tokens.textSecondary} />
        </TouchableOpacity>
      </NeomorphicCard>
    </View>
  );

  const renderCalendarTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Calendar Preferences</Text>

      <NeomorphicCard style={styles.card} contentStyle={styles.cardContent}>
        <Text style={styles.subsectionTitle}>Default View</Text>
        <View style={styles.optionRow}>
          {(["day", "week", "month"] as const).map((view) => (
            <TouchableOpacity
              key={view}
              style={[
                styles.optionButton,
                calendarPrefs.defaultView === view && { backgroundColor: tokens.accent, borderColor: tokens.accent },
                { borderColor: tokens.border },
              ]}
              onPress={() => saveCalendarPrefs({ ...calendarPrefs, defaultView: view })}
            >
              <Text
                style={[
                  styles.optionText,
                  calendarPrefs.defaultView === view && { color: tokens.background },
                  { color: tokens.textPrimary },
                ]}
              >
                {view.charAt(0).toUpperCase() + view.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.subsectionTitle, { marginTop: 20 }]}>Time Format</Text>
        <View style={styles.optionRow}>
          {(["12h", "24h"] as const).map((format) => (
            <TouchableOpacity
              key={format}
              style={[
                styles.optionButton,
                calendarPrefs.timeFormat === format && { backgroundColor: tokens.accent, borderColor: tokens.accent },
                { borderColor: tokens.border },
              ]}
              onPress={() => saveCalendarPrefs({ ...calendarPrefs, timeFormat: format })}
            >
              <Text
                style={[
                  styles.optionText,
                  calendarPrefs.timeFormat === format && { color: tokens.background },
                  { color: tokens.textPrimary },
                ]}
              >
                {format === "12h" ? "12-hour" : "24-hour"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.subsectionTitle, { marginTop: 20 }]}>Week Starts On</Text>
        <View style={styles.optionRow}>
          {(["sunday", "monday"] as const).map((day) => (
            <TouchableOpacity
              key={day}
              style={[
                styles.optionButton,
                calendarPrefs.weekStartDay === day && { backgroundColor: tokens.accent, borderColor: tokens.accent },
                { borderColor: tokens.border },
              ]}
              onPress={() => saveCalendarPrefs({ ...calendarPrefs, weekStartDay: day })}
            >
              <Text
                style={[
                  styles.optionText,
                  calendarPrefs.weekStartDay === day && { color: tokens.background },
                  { color: tokens.textPrimary },
                ]}
              >
                {day.charAt(0).toUpperCase() + day.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.subsectionTitle, { marginTop: 20 }]}>Working Hours</Text>
        <Text style={styles.settingDesc}>
          {calendarPrefs.workingHoursStart}:00 - {calendarPrefs.workingHoursEnd}:00
        </Text>
      </NeomorphicCard>
    </View>
  );

  const renderNotificationsTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Notification Settings</Text>

      <NeomorphicCard style={styles.card} contentStyle={styles.cardContent}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Ionicons name="phone-portrait-outline" size={24} color={tokens.accent} />
            <View style={styles.settingText}>
              <Text style={styles.settingLabel}>Push Notifications</Text>
              <Text style={styles.settingDesc}>Receive alerts on your device</Text>
            </View>
          </View>
          <Switch
            value={notificationPrefs.pushEnabled}
            onValueChange={(value) => saveNotificationPrefs({ ...notificationPrefs, pushEnabled: value })}
            trackColor={{ false: tokens.border, true: tokens.accent }}
            thumbColor={tokens.surface}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Ionicons name="mail-outline" size={24} color={tokens.accent} />
            <View style={styles.settingText}>
              <Text style={styles.settingLabel}>Email Notifications</Text>
              <Text style={styles.settingDesc}>Receive updates via email</Text>
            </View>
          </View>
          <Switch
            value={notificationPrefs.emailEnabled}
            onValueChange={(value) => saveNotificationPrefs({ ...notificationPrefs, emailEnabled: value })}
            trackColor={{ false: tokens.border, true: tokens.accent }}
            thumbColor={tokens.surface}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Ionicons name="newspaper-outline" size={24} color={tokens.accent} />
            <View style={styles.settingText}>
              <Text style={styles.settingLabel}>Daily Digest</Text>
              <Text style={styles.settingDesc}>Get a daily summary email</Text>
            </View>
          </View>
          <Switch
            value={notificationPrefs.dailyDigest}
            onValueChange={(value) => saveNotificationPrefs({ ...notificationPrefs, dailyDigest: value })}
            trackColor={{ false: tokens.border, true: tokens.accent }}
            thumbColor={tokens.surface}
          />
        </View>

        <View style={styles.divider} />

        <Text style={[styles.subsectionTitle, { marginTop: 8 }]}>Default Reminder</Text>
        <View style={styles.optionRow}>
          {[5, 10, 15, 30, 60].map((mins) => (
            <TouchableOpacity
              key={mins}
              style={[
                styles.optionButton,
                styles.optionButtonSmall,
                notificationPrefs.reminderMinutes === mins && { backgroundColor: tokens.accent, borderColor: tokens.accent },
                { borderColor: tokens.border },
              ]}
              onPress={() => saveNotificationPrefs({ ...notificationPrefs, reminderMinutes: mins })}
            >
              <Text
                style={[
                  styles.optionText,
                  styles.optionTextSmall,
                  notificationPrefs.reminderMinutes === mins && { color: tokens.background },
                  { color: tokens.textPrimary },
                ]}
              >
                {mins < 60 ? `${mins}m` : "1h"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </NeomorphicCard>
    </View>
  );

  const renderThemeTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Theme & Appearance</Text>

      <NeomorphicCard style={styles.card} contentStyle={styles.cardContent}>
        <Text style={styles.subsectionTitle}>Color Theme</Text>
        <View style={styles.themeGrid}>
          {colorThemes.map((option) => {
            const active = option.id === colorTheme;
            return (
              <TouchableOpacity
                key={option.id}
                style={[styles.themeOption, active && styles.themeOptionActive, { borderColor: active ? tokens.accent : tokens.border }]}
                onPress={() => setColorTheme(option.id)}
              >
                <Text style={[styles.themeLabel, { color: tokens.textPrimary }]}>{option.label}</Text>
                <Text style={[styles.themeDesc, { color: tokens.textSecondary }]}>{option.desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.subsectionTitle, { marginTop: 20 }]}>Window Style</Text>
        <View style={styles.optionRow}>
          {windowThemes.map((option) => {
            const active = option.id === windowTheme;
            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionButton,
                  active && { backgroundColor: tokens.accent, borderColor: tokens.accent },
                  { borderColor: tokens.border, flex: 1 },
                ]}
                onPress={() => setWindowTheme(option.id)}
              >
                <Text
                  style={[
                    styles.optionText,
                    active && { color: tokens.background },
                    { color: tokens.textPrimary },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.subsectionTitle, { marginTop: 20 }]}>Texture Grain</Text>
        <View style={styles.optionRow}>
          {grainLevels.map((option) => {
            const active = option.id === grainIntensity;
            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionButton,
                  styles.optionButtonSmall,
                  active && { backgroundColor: tokens.accent, borderColor: tokens.accent },
                  { borderColor: tokens.border },
                ]}
                onPress={() => setGrainIntensity(option.id)}
              >
                <Text
                  style={[
                    styles.optionText,
                    styles.optionTextSmall,
                    active && { color: tokens.background },
                    { color: tokens.textPrimary },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </NeomorphicCard>
    </View>
  );

  const renderPrivacyTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Data & Privacy</Text>

      <NeomorphicCard style={styles.card} contentStyle={styles.cardContent}>
        <TouchableOpacity style={styles.settingRow} onPress={handleExportData}>
          <View style={styles.settingInfo}>
            <Ionicons name="download-outline" size={24} color={tokens.accent} />
            <View style={styles.settingText}>
              <Text style={styles.settingLabel}>Export My Data</Text>
              <Text style={styles.settingDesc}>Download all your data as a file</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={tokens.textSecondary} />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.settingRow} onPress={handlePrivacyPolicy}>
          <View style={styles.settingInfo}>
            <Ionicons name="document-text-outline" size={24} color={tokens.accent} />
            <View style={styles.settingText}>
              <Text style={styles.settingLabel}>Privacy Policy</Text>
              <Text style={styles.settingDesc}>Read our privacy policy</Text>
            </View>
          </View>
          <Ionicons name="open-outline" size={20} color={tokens.textSecondary} />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.settingRow} onPress={handleTermsOfService}>
          <View style={styles.settingInfo}>
            <Ionicons name="reader-outline" size={24} color={tokens.accent} />
            <View style={styles.settingText}>
              <Text style={styles.settingLabel}>Terms of Service</Text>
              <Text style={styles.settingDesc}>Read our terms of service</Text>
            </View>
          </View>
          <Ionicons name="open-outline" size={20} color={tokens.textSecondary} />
        </TouchableOpacity>

        <View style={[styles.divider, { marginVertical: 20 }]} />

        <TouchableOpacity style={[styles.dangerButton, { borderColor: "#EF4444" }]} onPress={handleDeleteAccount}>
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
          <Text style={styles.dangerButtonText}>Delete Account</Text>
        </TouchableOpacity>
      </NeomorphicCard>
    </View>
  );

  const renderAboutTab = () => {
    const appVersion = Application.nativeApplicationVersion || "1.0.0";
    const buildNumber = Application.nativeBuildVersion || "1";

    return (
      <View style={styles.tabContent}>
        <Text style={styles.sectionTitle}>About Becky CRM</Text>

        <NeomorphicCard style={styles.card} contentStyle={styles.cardContent}>
          <View style={styles.appInfo}>
            <View style={[styles.appIcon, { backgroundColor: tokens.accent }]}>
              <Text style={[styles.appIconText, { color: tokens.background }]}>B</Text>
            </View>
            <Text style={[styles.appName, { color: tokens.textPrimary }]}>Becky CRM</Text>
            <Text style={[styles.appVersion, { color: tokens.textSecondary }]}>
              Version {appVersion} ({buildNumber})
            </Text>
          </View>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.settingRow} onPress={handleSupport}>
            <View style={styles.settingInfo}>
              <Ionicons name="help-circle-outline" size={24} color={tokens.accent} />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Contact Support</Text>
                <Text style={styles.settingDesc}>Get help with the app</Text>
              </View>
            </View>
            <Ionicons name="mail-outline" size={20} color={tokens.textSecondary} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => Linking.openURL("https://evangelosommer.com")}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="globe-outline" size={24} color={tokens.accent} />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Visit Website</Text>
                <Text style={styles.settingDesc}>evangelosommer.com</Text>
              </View>
            </View>
            <Ionicons name="open-outline" size={20} color={tokens.textSecondary} />
          </TouchableOpacity>

          <View style={[styles.divider, { marginVertical: 20 }]} />

          <TouchableOpacity style={[styles.logoutButton, { borderColor: tokens.accent }]} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={tokens.accent} />
            <Text style={[styles.logoutButtonText, { color: tokens.accent }]}>Sign Out</Text>
          </TouchableOpacity>
        </NeomorphicCard>

        <Text style={[styles.copyright, { color: tokens.textSecondary }]}>
          Made with care by Evangelo Sommer
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: tokens.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={tokens.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: tokens.textPrimary }]}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tab Navigation */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabBar}
        contentContainerStyle={styles.tabBarContent}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tabButton,
              activeTab === tab.id && { backgroundColor: tokens.accent },
              { borderColor: tokens.border },
            ]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Ionicons
              name={tab.icon}
              size={18}
              color={activeTab === tab.id ? tokens.background : tokens.textSecondary}
            />
            <Text
              style={[
                styles.tabButtonText,
                activeTab === tab.id && { color: tokens.background },
                { color: tokens.textSecondary },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderTabContent()}
      </ScrollView>
    </View>
  );
}

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    backBtn: {
      width: 40,
      height: 40,
      justifyContent: "center",
      alignItems: "center",
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: "700",
      fontFamily: "Bytesized-Regular",
    },
    tabBar: {
      maxHeight: 50,
      marginBottom: 8,
    },
    tabBarContent: {
      paddingHorizontal: 16,
      gap: 8,
    },
    tabButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 20,
      borderWidth: 1,
    },
    tabButtonText: {
      fontSize: 13,
      fontWeight: "600",
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 32,
    },
    tabContent: {
      paddingHorizontal: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: tokens.textPrimary,
      marginBottom: 16,
      fontFamily: "Bytesized-Regular",
    },
    subsectionTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: tokens.textSecondary,
      marginBottom: 10,
      textTransform: "uppercase",
    },
    card: {
      width: "100%",
      marginBottom: 16,
    },
    cardContent: {
      padding: 16,
    },
    formGroup: {
      gap: 4,
    },
    inputLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: tokens.textSecondary,
      textTransform: "uppercase",
      marginBottom: 6,
    },
    input: {
      backgroundColor: tokens.background,
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
    },
    buttonRow: {
      flexDirection: "row",
      gap: 12,
      marginTop: 20,
    },
    button: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    buttonPrimary: {},
    buttonSecondary: {
      backgroundColor: "transparent",
      borderWidth: 1,
    },
    buttonText: {
      fontSize: 14,
      fontWeight: "700",
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      marginBottom: 16,
    },
    avatarLarge: {
      width: 64,
      height: 64,
      borderRadius: 20,
      backgroundColor: tokens.accent,
      justifyContent: "center",
      alignItems: "center",
    },
    avatarTextLarge: {
      fontSize: 24,
      fontWeight: "700",
      color: tokens.background,
    },
    infoDetails: {
      flex: 1,
    },
    profileName: {
      fontSize: 18,
      fontWeight: "700",
      color: tokens.textPrimary,
    },
    profileEmail: {
      fontSize: 14,
      color: tokens.textSecondary,
      marginTop: 2,
    },
    profileRole: {
      fontSize: 12,
      color: tokens.accent,
      marginTop: 4,
      textTransform: "uppercase",
      fontWeight: "600",
    },
    editButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
    },
    editButtonText: {
      fontSize: 14,
      fontWeight: "600",
    },
    settingRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 12,
    },
    settingInfo: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      flex: 1,
    },
    settingText: {
      flex: 1,
    },
    settingLabel: {
      fontSize: 15,
      fontWeight: "600",
      color: tokens.textPrimary,
    },
    settingDesc: {
      fontSize: 12,
      color: tokens.textSecondary,
      marginTop: 2,
    },
    divider: {
      height: 1,
      backgroundColor: tokens.border,
      marginVertical: 4,
    },
    optionRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    optionButton: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 12,
      borderWidth: 1,
      backgroundColor: tokens.surface,
    },
    optionButtonSmall: {
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    optionText: {
      fontSize: 14,
      fontWeight: "600",
    },
    optionTextSmall: {
      fontSize: 12,
    },
    themeGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    themeOption: {
      width: "48%",
      padding: 12,
      borderRadius: 14,
      borderWidth: 1,
      backgroundColor: tokens.surface,
    },
    themeOptionActive: {
      shadowColor: tokens.shadowDark,
      shadowOffset: { width: 2, height: 2 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 4,
    },
    themeLabel: {
      fontSize: 14,
      fontWeight: "700",
    },
    themeDesc: {
      fontSize: 11,
      marginTop: 4,
    },
    dangerButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
    },
    dangerButtonText: {
      fontSize: 14,
      fontWeight: "600",
      color: "#EF4444",
    },
    appInfo: {
      alignItems: "center",
      paddingVertical: 16,
    },
    appIcon: {
      width: 72,
      height: 72,
      borderRadius: 20,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 12,
    },
    appIconText: {
      fontSize: 36,
      fontWeight: "700",
      fontFamily: "PressStart2P",
    },
    appName: {
      fontSize: 20,
      fontWeight: "700",
      fontFamily: "Bytesized-Regular",
    },
    appVersion: {
      fontSize: 13,
      marginTop: 4,
    },
    logoutButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
    },
    logoutButtonText: {
      fontSize: 14,
      fontWeight: "600",
    },
    copyright: {
      textAlign: "center",
      fontSize: 12,
      marginTop: 24,
    },
  });
