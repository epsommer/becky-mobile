/**
 * ContactInfoModal - Modal for displaying full contact details
 *
 * Features:
 * - Displays comprehensive contact information from device
 * - Shows phone numbers, emails, addresses with type labels
 * - Actions to open contacts app or create client
 * - Slide-up animation with modal overlay
 * - Themed styling matching app design system
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeTokens, useTheme } from '../../theme/ThemeContext';
import { useContactActions, FullContactDetails } from '../../hooks/useContactActions';
import { LocalContact } from '../../lib/database/models/LocalContact';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ContactInfoModalProps {
  visible: boolean;
  contact: LocalContact | null;
  onClose: () => void;
  onCreateClient: (contact: LocalContact) => void;
}

export default function ContactInfoModal({
  visible,
  contact,
  onClose,
  onCreateClient,
}: ContactInfoModalProps) {
  const { tokens } = useTheme();
  const styles = useMemo(() => createStyles(tokens), [tokens]);

  const {
    fetchFullContactDetails,
    isLoadingContactDetails,
    contactDetailsError,
    openContactsApp,
    openSMS,
    canOpenSMS,
  } = useContactActions();

  const [fullDetails, setFullDetails] = useState<FullContactDetails | null>(null);
  const slideAnim = useMemo(() => new Animated.Value(SCREEN_HEIGHT), []);

  // Fetch full contact details when modal opens
  useEffect(() => {
    if (visible && contact) {
      setFullDetails(null);
      fetchFullContactDetails(contact.deviceContactId).then((details) => {
        setFullDetails(details);
      });

      // Slide up animation
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      // Reset animation
      slideAnim.setValue(SCREEN_HEIGHT);
    }
  }, [visible, contact, fetchFullContactDetails, slideAnim]);

  const handleClose = () => {
    // Slide down animation
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  const handleCreateClient = () => {
    if (contact) {
      handleClose();
      // Slight delay to let modal close animation complete
      setTimeout(() => {
        onCreateClient(contact);
      }, 300);
    }
  };

  const handleOpenContacts = async () => {
    await openContactsApp();
  };

  const handleSendSMS = async (phoneNumber: string) => {
    await openSMS(phoneNumber);
  };

  // Get initials for avatar
  const getInitials = (name?: string): string => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Format phone label for display
  const formatLabel = (label?: string): string => {
    if (!label) return 'Phone';
    // Handle common labels
    const labelMap: Record<string, string> = {
      mobile: 'Mobile',
      home: 'Home',
      work: 'Work',
      main: 'Main',
      other: 'Other',
      iphone: 'iPhone',
      'home fax': 'Home Fax',
      'work fax': 'Work Fax',
    };
    return labelMap[label.toLowerCase()] || label;
  };

  // Format address for display
  const formatAddress = (address: FullContactDetails['addresses']): string | null => {
    if (!address || address.length === 0) return null;
    const addr = address[0];
    const parts = [addr.street, addr.city, addr.region, addr.postalCode, addr.country].filter(Boolean);
    return parts.join(', ');
  };

  if (!contact) return null;

  const displayName = fullDetails?.name || contact.displayName;
  const hasPhone = fullDetails?.phoneNumbers && fullDetails.phoneNumbers.length > 0;
  const hasEmail = fullDetails?.emails && fullDetails.emails.length > 0;
  const hasAddress = fullDetails?.addresses && fullDetails.addresses.length > 0;
  const formattedAddress = hasAddress ? formatAddress(fullDetails.addresses) : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdropTouchable} onPress={handleClose} activeOpacity={1} />

        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={tokens.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Contact Info</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Content */}
          {isLoadingContactDetails ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={tokens.accent} />
              <Text style={styles.loadingText}>Loading contact details...</Text>
            </View>
          ) : contactDetailsError ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={48} color={tokens.muted} />
              <Text style={styles.errorText}>{contactDetailsError}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => {
                if (contact) fetchFullContactDetails(contact.deviceContactId).then(setFullDetails);
              }}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {/* Avatar and Name */}
              <View style={styles.avatarSection}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{getInitials(displayName)}</Text>
                </View>
                <Text style={styles.contactName}>{displayName}</Text>
                {fullDetails?.company && (
                  <Text style={styles.companyText}>{fullDetails.company}</Text>
                )}
                {fullDetails?.jobTitle && (
                  <Text style={styles.jobTitleText}>{fullDetails.jobTitle}</Text>
                )}
              </View>

              {/* Synced status */}
              {contact.isMatched && (
                <View style={styles.syncedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color={tokens.accent} />
                  <Text style={styles.syncedText}>Synced to CRM</Text>
                </View>
              )}

              {/* Phone Numbers */}
              {hasPhone && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Phone Numbers</Text>
                  {fullDetails.phoneNumbers!.map((phone, index) => (
                    <View key={phone.id || index} style={styles.infoRow}>
                      <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>{formatLabel(phone.label)}</Text>
                        <Text style={styles.infoValue}>{phone.number}</Text>
                      </View>
                      <View style={styles.infoActions}>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => phone.number && handleSendSMS(phone.number)}
                          disabled={!canOpenSMS(phone.number)}
                        >
                          <Ionicons
                            name="chatbubble-outline"
                            size={20}
                            color={canOpenSMS(phone.number) ? tokens.accent : tokens.muted}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Emails */}
              {hasEmail && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Email Addresses</Text>
                  {fullDetails.emails!.map((email, index) => (
                    <View key={email.id || index} style={styles.infoRow}>
                      <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>{formatLabel(email.label)}</Text>
                        <Text style={styles.infoValue}>{email.email}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Address */}
              {formattedAddress && fullDetails?.addresses && fullDetails.addresses.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Address</Text>
                  <View style={styles.infoRow}>
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>{formatLabel(fullDetails.addresses[0].label)}</Text>
                      <Text style={styles.infoValue}>{formattedAddress}</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Notes */}
              {fullDetails?.note && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Notes</Text>
                  <View style={styles.notesContainer}>
                    <Text style={styles.notesText}>{fullDetails.note}</Text>
                  </View>
                </View>
              )}

              {/* Birthday */}
              {fullDetails?.birthday && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Birthday</Text>
                  <View style={styles.infoRow}>
                    <View style={styles.infoContent}>
                      <Text style={styles.infoValue}>
                        {fullDetails.birthday.toLocaleDateString(undefined, {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* No data fallback */}
              {!hasPhone && !hasEmail && !formattedAddress && !fullDetails?.note && (
                <View style={styles.noDataContainer}>
                  <Ionicons name="information-circle-outline" size={32} color={tokens.muted} />
                  <Text style={styles.noDataText}>
                    No additional information available for this contact.
                  </Text>
                </View>
              )}

              {/* Spacer for bottom actions */}
              <View style={{ height: 20 }} />
            </ScrollView>
          )}

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.footerButton, styles.secondaryButton]}
              onPress={handleOpenContacts}
              activeOpacity={0.7}
            >
              <Ionicons name="open-outline" size={18} color={tokens.accent} />
              <Text style={styles.secondaryButtonText}>Open in Contacts</Text>
            </TouchableOpacity>

            {!contact.isMatched && (
              <TouchableOpacity
                style={[styles.footerButton, styles.primaryButton]}
                onPress={handleCreateClient}
                activeOpacity={0.7}
              >
                <Ionicons name="person-add-outline" size={18} color="#ffffff" />
                <Text style={styles.primaryButtonText}>Create Client</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    backdropTouchable: {
      flex: 1,
    },
    container: {
      backgroundColor: tokens.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: SCREEN_HEIGHT * 0.85,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 16,
    },
    handleBar: {
      width: 36,
      height: 4,
      backgroundColor: tokens.border,
      borderRadius: 2,
      alignSelf: 'center',
      marginTop: 8,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: tokens.border,
    },
    closeButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: tokens.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: tokens.textPrimary,
    },
    content: {
      flex: 1,
      paddingHorizontal: 16,
    },
    loadingContainer: {
      padding: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      marginTop: 16,
      fontSize: 14,
      color: tokens.textSecondary,
    },
    errorContainer: {
      padding: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorText: {
      marginTop: 12,
      fontSize: 14,
      color: tokens.textSecondary,
      textAlign: 'center',
    },
    retryButton: {
      marginTop: 16,
      paddingHorizontal: 20,
      paddingVertical: 10,
      backgroundColor: tokens.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: tokens.accent,
    },
    retryButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: tokens.accent,
    },
    avatarSection: {
      alignItems: 'center',
      paddingVertical: 24,
    },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: tokens.surface,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
      borderWidth: 2,
      borderColor: tokens.border,
    },
    avatarText: {
      fontSize: 28,
      fontWeight: '700',
      color: tokens.accent,
    },
    contactName: {
      fontSize: 22,
      fontWeight: '700',
      color: tokens.textPrimary,
      textAlign: 'center',
    },
    companyText: {
      fontSize: 15,
      color: tokens.textSecondary,
      marginTop: 4,
    },
    jobTitleText: {
      fontSize: 14,
      color: tokens.muted,
      marginTop: 2,
    },
    syncedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'center',
      backgroundColor: tokens.accent + '20',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      gap: 6,
      marginBottom: 16,
    },
    syncedText: {
      fontSize: 13,
      fontWeight: '500',
      color: tokens.accent,
    },
    section: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: tokens.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: tokens.surface,
      borderRadius: 10,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    infoContent: {
      flex: 1,
    },
    infoLabel: {
      fontSize: 12,
      fontWeight: '500',
      color: tokens.muted,
      marginBottom: 2,
    },
    infoValue: {
      fontSize: 15,
      color: tokens.textPrimary,
    },
    infoActions: {
      flexDirection: 'row',
      gap: 8,
    },
    actionButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: tokens.background,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: tokens.border,
    },
    notesContainer: {
      backgroundColor: tokens.surface,
      borderRadius: 10,
      padding: 12,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    notesText: {
      fontSize: 14,
      lineHeight: 20,
      color: tokens.textPrimary,
    },
    noDataContainer: {
      alignItems: 'center',
      paddingVertical: 32,
    },
    noDataText: {
      fontSize: 14,
      color: tokens.textSecondary,
      textAlign: 'center',
      marginTop: 12,
      paddingHorizontal: 20,
    },
    footer: {
      flexDirection: 'row',
      padding: 16,
      gap: 12,
      borderTopWidth: 1,
      borderTopColor: tokens.border,
      paddingBottom: 34, // Extra padding for bottom safe area
    },
    footerButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: 10,
      gap: 8,
    },
    secondaryButton: {
      backgroundColor: tokens.surface,
      borderWidth: 1,
      borderColor: tokens.accent,
    },
    secondaryButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: tokens.accent,
    },
    primaryButton: {
      backgroundColor: tokens.accent,
    },
    primaryButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#ffffff',
    },
  });
