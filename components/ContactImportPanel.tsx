"use client";

import React, { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemeTokens, useTheme } from "../theme/ThemeContext";
import { usePermissions } from "../hooks/usePermissions";
import { useContactImport } from "../hooks/useContactImport";

interface ContactImportPanelProps {
  onViewContacts?: () => void;
}

export default function ContactImportPanel({ onViewContacts }: ContactImportPanelProps) {
  const { tokens } = useTheme();
  const styles = React.useMemo(() => createStyles(tokens), [tokens]);

  const { permissions, requestContactsPermission, checkContactsPermission } = usePermissions();
  const { importing, stats, lastImportResult, error, importContacts, refreshStats } = useContactImport();

  // Check permission on mount
  useEffect(() => {
    checkContactsPermission();
  }, [checkContactsPermission]);

  const handleImportContacts = async () => {
    // Check permission first
    if (permissions.contacts !== 'granted') {
      const granted = await requestContactsPermission();
      if (!granted) {
        return;
      }
    }

    // Import contacts
    await importContacts();
  };

  return (
    <View style={styles.panel}>
      <View style={styles.headingRow}>
        <Text style={styles.heading}>Contact Import</Text>
        <TouchableOpacity onPress={refreshStats} disabled={importing}>
          <Ionicons name="refresh" size={16} color={tokens.accent} />
        </TouchableOpacity>
      </View>

      {/* Permission Status */}
      {permissions.contacts !== 'granted' && (
        <View style={[styles.permissionBox, { backgroundColor: tokens.background, borderColor: tokens.accent }]}>
          <Ionicons name="warning" size={20} color={tokens.highlight} />
          <Text style={[styles.permissionText, { color: tokens.textSecondary }]}>
            Contacts permission required to import contacts from your device
          </Text>
        </View>
      )}

      {/* Stats Display */}
      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: tokens.textPrimary }]}>{stats.total}</Text>
            <Text style={[styles.statLabel, { color: tokens.textSecondary }]}>Total Contacts</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: tokens.accent }]}>{stats.matched}</Text>
            <Text style={[styles.statLabel, { color: tokens.textSecondary }]}>Matched</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: tokens.highlight }]}>{stats.unmatched}</Text>
            <Text style={[styles.statLabel, { color: tokens.textSecondary }]}>Unmatched</Text>
          </View>
        </View>
      )}

      {/* Last Import Result */}
      {lastImportResult && lastImportResult.success && (
        <View style={[styles.resultBox, { backgroundColor: tokens.background }]}>
          <Ionicons name="checkmark" size={16} color={tokens.accent} />
          <Text style={[styles.resultText, { color: tokens.textSecondary }]}>
            Imported {lastImportResult.imported} new, updated {lastImportResult.updated}
          </Text>
        </View>
      )}

      {/* Error Display */}
      {error && (
        <View style={[styles.errorBox, { backgroundColor: '#fee', borderColor: '#fcc' }]}>
          <Ionicons name="close" size={16} color="#c33" />
          <Text style={[styles.errorText, { color: '#c33' }]}>{error}</Text>
        </View>
      )}

      {/* Import Button */}
      <TouchableOpacity
        style={[
          styles.importButton,
          {
            backgroundColor: importing ? tokens.background : tokens.accent,
            borderColor: tokens.accent,
          }
        ]}
        onPress={handleImportContacts}
        disabled={importing}
      >
        {importing ? (
          <>
            <ActivityIndicator size="small" color={tokens.accent} />
            <Text style={[styles.buttonText, { color: tokens.accent }]}>
              {stats && stats.total > 0 ? 'SYNCING...' : 'IMPORTING...'}
            </Text>
          </>
        ) : (
          <>
            <Ionicons name={stats && stats.total > 0 ? 'sync' : 'download'} size={16} color="#000" />
            <Text style={[styles.buttonText, { color: '#000' }]}>
              {permissions.contacts !== 'granted'
                ? 'GRANT PERMISSION & IMPORT'
                : stats && stats.total > 0
                  ? 'SYNC CONTACTS'
                  : 'IMPORT CONTACTS'}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* Help Text */}
      <Text style={[styles.helpText, { color: tokens.textSecondary }]}>
        Import your device contacts to automatically match SMS, emails, and calendar events to clients.
      </Text>

      {/* View Contacts Link */}
      {stats && stats.total > 0 && onViewContacts && (
        <TouchableOpacity onPress={onViewContacts} style={styles.viewContactsLink}>
          <Text style={[styles.viewContactsText, { color: tokens.accent }]}>
            View all {stats.total} contacts →
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    panel: {
      width: '100%',
      alignSelf: 'stretch',
      marginBottom: 16,
    },
    headingRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    heading: {
      fontSize: 16,
      fontFamily: 'Bytesized-Regular',
      fontWeight: "700",
      color: tokens.textPrimary,
    },
    permissionBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      borderRadius: 4,
      borderWidth: 1,
      marginBottom: 12,
    },
    permissionText: {
      flex: 1,
      fontSize: 12,
      fontFamily: 'lores-9-wide',
    },
    statsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: 16,
    },
    statItem: {
      alignItems: 'center',
    },
    statValue: {
      fontSize: 24,
      fontFamily: 'Bytesized-Regular',
      fontWeight: '700',
    },
    statLabel: {
      fontSize: 10,
      fontFamily: 'lores-9-wide',
      textTransform: 'uppercase',
      marginTop: 4,
    },
    resultBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 12,
      borderRadius: 4,
      marginBottom: 12,
    },
    resultText: {
      fontSize: 12,
      fontFamily: 'lores-9-wide',
    },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 12,
      borderRadius: 4,
      borderWidth: 1,
      marginBottom: 12,
    },
    errorText: {
      flex: 1,
      fontSize: 12,
      fontFamily: 'lores-9-wide',
    },
    importButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: 12,
      borderRadius: 4,
      borderWidth: 2,
      marginBottom: 12,
    },
    buttonText: {
      fontSize: 12,
      fontFamily: 'lores-9-wide',
      fontWeight: '700',
    },
    helpText: {
      fontSize: 11,
      fontFamily: 'lores-9-wide',
      textAlign: 'center',
      lineHeight: 16,
    },
    viewContactsLink: {
      marginTop: 12,
      alignItems: 'center',
    },
    viewContactsText: {
      fontSize: 13,
      fontFamily: 'lores-9-wide',
      fontWeight: '600',
    },
  });
