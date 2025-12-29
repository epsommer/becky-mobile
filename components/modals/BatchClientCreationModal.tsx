/**
 * BatchClientCreationModal - Modal for batch client creation from contacts
 *
 * Features:
 * - Preview list of selected contacts to convert to clients
 * - Editable fields (name, phone, email) for each contact
 * - Validation for required fields (name)
 * - Include/exclude checkbox for each contact
 * - Progress indicator during creation
 * - Success/error feedback with partial success handling
 * - Themed styling matching app design system
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ThemeTokens, useTheme } from '../../theme/ThemeContext';
import {
  useContactActions,
  ContactForCreation,
  BatchCreationResult,
} from '../../hooks/useContactActions';
import { LocalContact } from '../../lib/database/models/LocalContact';

interface BatchClientCreationModalProps {
  visible: boolean;
  contacts: LocalContact[];
  onClose: () => void;
  onSuccess: (result: BatchCreationResult) => void;
}

interface EditableContact extends ContactForCreation {
  isIncluded: boolean;
  isEditing: boolean;
}

export default function BatchClientCreationModal({
  visible,
  contacts,
  onClose,
  onSuccess,
}: BatchClientCreationModalProps) {
  const { tokens } = useTheme();
  const styles = useMemo(() => createStyles(tokens), [tokens]);

  const {
    prepareContactForCreation,
    validateContactForCreation,
    createClientsFromContacts,
    isCreatingClients,
    creationProgress,
  } = useContactActions();

  const [editableContacts, setEditableContacts] = useState<EditableContact[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [creationResult, setCreationResult] = useState<BatchCreationResult | null>(null);

  // Initialize editable contacts when modal opens
  useEffect(() => {
    if (visible && contacts.length > 0) {
      const prepared = contacts.map((contact) => {
        const base = prepareContactForCreation(contact);
        return {
          ...base,
          isIncluded: true,
          isEditing: false,
        };
      });
      setEditableContacts(prepared);
      setShowResults(false);
      setCreationResult(null);
      setEditingIndex(null);
    }
  }, [visible, contacts, prepareContactForCreation]);

  // Toggle include/exclude for a contact
  const toggleInclude = useCallback((index: number) => {
    Haptics.selectionAsync();
    setEditableContacts((prev) =>
      prev.map((c, i) => (i === index ? { ...c, isIncluded: !c.isIncluded } : c))
    );
  }, []);

  // Update a field for a contact
  const updateField = useCallback(
    (index: number, field: 'editedName' | 'editedPhone' | 'editedEmail', value: string) => {
      setEditableContacts((prev) =>
        prev.map((c, i) => {
          if (i !== index) return c;
          const updated = { ...c, [field]: value };
          // Re-validate
          const validation = validateContactForCreation({
            ...updated,
            displayName: updated.editedName || c.displayName,
          });
          return { ...updated, isValid: validation.isValid, validationError: validation.error };
        })
      );
    },
    [validateContactForCreation]
  );

  // Start editing a contact
  const startEditing = useCallback((index: number) => {
    Haptics.selectionAsync();
    setEditingIndex(index);
    setEditableContacts((prev) =>
      prev.map((c, i) => ({
        ...c,
        isEditing: i === index,
        // Initialize edited fields if not set
        editedName: i === index && !c.editedName ? c.displayName : c.editedName,
        editedPhone: i === index && !c.editedPhone ? c.phone : c.editedPhone,
        editedEmail: i === index && !c.editedEmail ? c.email : c.editedEmail,
      }))
    );
  }, []);

  // Stop editing
  const stopEditing = useCallback(() => {
    setEditingIndex(null);
    setEditableContacts((prev) =>
      prev.map((c) => ({ ...c, isEditing: false }))
    );
  }, []);

  // Get count of included and valid contacts
  const includedContacts = editableContacts.filter((c) => c.isIncluded);
  const validIncludedContacts = includedContacts.filter((c) => {
    const validation = validateContactForCreation(c);
    return validation.isValid;
  });

  // Handle create clients
  const handleCreate = useCallback(async () => {
    if (validIncludedContacts.length === 0) {
      Alert.alert(
        'No Valid Contacts',
        'Please ensure at least one contact has a valid name to create clients.'
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Map to ContactForCreation
    const contactsToCreate: ContactForCreation[] = includedContacts
      .filter((c) => {
        const validation = validateContactForCreation(c);
        return validation.isValid;
      })
      .map((c) => ({
        localContactId: c.localContactId,
        deviceContactId: c.deviceContactId,
        displayName: c.editedName || c.displayName,
        phone: c.editedPhone || c.phone,
        email: c.editedEmail || c.email,
        company: c.company,
        editedName: c.editedName,
        editedPhone: c.editedPhone,
        editedEmail: c.editedEmail,
        isValid: true,
      }));

    const result = await createClientsFromContacts(contactsToCreate);
    setCreationResult(result);
    setShowResults(true);

    if (result.success) {
      onSuccess(result);
    }
  }, [
    includedContacts,
    validIncludedContacts,
    validateContactForCreation,
    createClientsFromContacts,
    onSuccess,
  ]);

  // Handle close
  const handleClose = useCallback(() => {
    if (isCreatingClients) return;
    onClose();
  }, [isCreatingClients, onClose]);

  // Handle done after viewing results
  const handleDone = useCallback(() => {
    onClose();
  }, [onClose]);

  // Render a single contact row
  const renderContactRow = (contact: EditableContact, index: number) => {
    const validation = validateContactForCreation(contact);
    const displayName = contact.editedName || contact.displayName;
    const displayPhone = contact.editedPhone || contact.phone;
    const displayEmail = contact.editedEmail || contact.email;
    const isEditing = editingIndex === index;

    return (
      <View
        key={contact.localContactId}
        style={[
          styles.contactRow,
          !contact.isIncluded && styles.contactRowExcluded,
          !validation.isValid && contact.isIncluded && styles.contactRowInvalid,
        ]}
      >
        {/* Include checkbox */}
        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => toggleInclude(index)}
          disabled={isCreatingClients}
        >
          <View
            style={[
              styles.checkbox,
              contact.isIncluded && styles.checkboxChecked,
              { borderColor: contact.isIncluded ? tokens.accent : tokens.border },
            ]}
          >
            {contact.isIncluded && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
        </TouchableOpacity>

        {/* Contact info */}
        <View style={styles.contactInfoContainer}>
          {isEditing ? (
            // Editing mode
            <View style={styles.editingContainer}>
              <View style={styles.editField}>
                <Text style={styles.editLabel}>Name *</Text>
                <TextInput
                  style={[
                    styles.editInput,
                    !validation.isValid && styles.editInputInvalid,
                  ]}
                  value={contact.editedName || ''}
                  onChangeText={(value) => updateField(index, 'editedName', value)}
                  placeholder="Enter name"
                  placeholderTextColor={tokens.muted}
                  autoFocus
                />
                {!validation.isValid && (
                  <Text style={styles.validationError}>{validation.error}</Text>
                )}
              </View>

              <View style={styles.editField}>
                <Text style={styles.editLabel}>Phone</Text>
                <TextInput
                  style={styles.editInput}
                  value={contact.editedPhone || ''}
                  onChangeText={(value) => updateField(index, 'editedPhone', value)}
                  placeholder="Enter phone"
                  placeholderTextColor={tokens.muted}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.editField}>
                <Text style={styles.editLabel}>Email</Text>
                <TextInput
                  style={styles.editInput}
                  value={contact.editedEmail || ''}
                  onChangeText={(value) => updateField(index, 'editedEmail', value)}
                  placeholder="Enter email"
                  placeholderTextColor={tokens.muted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity style={styles.doneEditingButton} onPress={stopEditing}>
                <Text style={styles.doneEditingText}>Done</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // View mode
            <TouchableOpacity
              style={styles.contactDetails}
              onPress={() => startEditing(index)}
              disabled={isCreatingClients}
            >
              <Text
                style={[
                  styles.contactName,
                  !contact.isIncluded && styles.textExcluded,
                  !validation.isValid && contact.isIncluded && styles.textInvalid,
                ]}
                numberOfLines={1}
              >
                {displayName || '(No name)'}
              </Text>
              {displayPhone && (
                <Text
                  style={[styles.contactDetailText, !contact.isIncluded && styles.textExcluded]}
                  numberOfLines={1}
                >
                  {displayPhone}
                </Text>
              )}
              {displayEmail && (
                <Text
                  style={[styles.contactDetailText, !contact.isIncluded && styles.textExcluded]}
                  numberOfLines={1}
                >
                  {displayEmail}
                </Text>
              )}
              {!validation.isValid && contact.isIncluded && (
                <View style={styles.validationBadge}>
                  <Ionicons name="warning" size={12} color="#f59e0b" />
                  <Text style={styles.validationBadgeText}>{validation.error}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Edit button */}
        {!isEditing && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => startEditing(index)}
            disabled={isCreatingClients}
          >
            <Ionicons name="pencil" size={16} color={tokens.accent} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Render results view
  const renderResults = () => {
    if (!creationResult) return null;

    return (
      <View style={styles.resultsContainer}>
        <View style={styles.resultsHeader}>
          {creationResult.successCount > 0 ? (
            <>
              <View style={[styles.resultsIcon, { backgroundColor: tokens.accent + '20' }]}>
                <Ionicons name="checkmark-circle" size={48} color={tokens.accent} />
              </View>
              <Text style={styles.resultsTitle}>
                {creationResult.failedCount === 0 ? 'Success!' : 'Partial Success'}
              </Text>
              <Text style={styles.resultsSubtitle}>
                Created {creationResult.successCount} client{creationResult.successCount !== 1 ? 's' : ''}
                {creationResult.failedCount > 0 && ` (${creationResult.failedCount} failed)`}
              </Text>
            </>
          ) : (
            <>
              <View style={[styles.resultsIcon, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                <Ionicons name="close-circle" size={48} color="#ef4444" />
              </View>
              <Text style={styles.resultsTitle}>Creation Failed</Text>
              <Text style={styles.resultsSubtitle}>
                Unable to create any clients. Please try again.
              </Text>
            </>
          )}
        </View>

        {/* Failed contacts list */}
        {creationResult.failedContacts.length > 0 && (
          <View style={styles.failedSection}>
            <Text style={styles.failedTitle}>Failed to create:</Text>
            <ScrollView style={styles.failedList} showsVerticalScrollIndicator={false}>
              {creationResult.failedContacts.map((failed, index) => {
                const contact = editableContacts.find((c) => c.localContactId === failed.contactId);
                return (
                  <View key={failed.contactId || index} style={styles.failedItem}>
                    <Text style={styles.failedName}>
                      {contact?.editedName || contact?.displayName || 'Unknown'}
                    </Text>
                    <Text style={styles.failedError}>{failed.error}</Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Done button */}
        <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Render progress view
  const renderProgress = () => (
    <View style={styles.progressContainer}>
      <ActivityIndicator size="large" color={tokens.accent} />
      <Text style={styles.progressTitle}>Creating Clients...</Text>
      <Text style={styles.progressSubtitle}>
        {creationProgress.current} of {creationProgress.total}
      </Text>
      <View style={styles.progressBarContainer}>
        <View
          style={[
            styles.progressBar,
            {
              width: `${
                creationProgress.total > 0
                  ? (creationProgress.current / creationProgress.total) * 100
                  : 0
              }%`,
            },
          ]}
        />
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButton}
              disabled={isCreatingClients}
            >
              <Ionicons
                name="close"
                size={24}
                color={isCreatingClients ? tokens.muted : tokens.textSecondary}
              />
            </TouchableOpacity>

            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>
                Create {validIncludedContacts.length} Client{validIncludedContacts.length !== 1 ? 's' : ''}
              </Text>
              <Text style={styles.headerSubtitle}>From your device contacts</Text>
            </View>

            <View style={{ width: 40 }} />
          </View>

          {/* Content */}
          {isCreatingClients ? (
            renderProgress()
          ) : showResults ? (
            renderResults()
          ) : (
            <>
              {/* Stats bar */}
              <View style={styles.statsBar}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{editableContacts.length}</Text>
                  <Text style={styles.statLabel}>Total</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: tokens.accent }]}>
                    {includedContacts.length}
                  </Text>
                  <Text style={styles.statLabel}>Included</Text>
                </View>
                <View style={styles.statItem}>
                  <Text
                    style={[
                      styles.statValue,
                      {
                        color:
                          validIncludedContacts.length < includedContacts.length
                            ? '#f59e0b'
                            : tokens.accent,
                      },
                    ]}
                  >
                    {validIncludedContacts.length}
                  </Text>
                  <Text style={styles.statLabel}>Valid</Text>
                </View>
              </View>

              {/* Info banner */}
              {validIncludedContacts.length < includedContacts.length && (
                <View style={styles.infoBanner}>
                  <Ionicons name="information-circle" size={18} color="#f59e0b" />
                  <Text style={styles.infoBannerText}>
                    Some contacts are missing required information. Tap to edit.
                  </Text>
                </View>
              )}

              {/* Contacts list */}
              <ScrollView
                style={styles.contactsList}
                contentContainerStyle={styles.contactsListContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {editableContacts.map((contact, index) => renderContactRow(contact, index))}
              </ScrollView>

              {/* Footer */}
              <View style={styles.footer}>
                <TouchableOpacity
                  style={[styles.footerButton, styles.cancelButton]}
                  onPress={handleClose}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.footerButton,
                    styles.createButton,
                    validIncludedContacts.length === 0 && styles.createButtonDisabled,
                  ]}
                  onPress={handleCreate}
                  disabled={validIncludedContacts.length === 0}
                >
                  <Ionicons name="people" size={18} color="#ffffff" />
                  <Text style={styles.createButtonText}>
                    Create {validIncludedContacts.length} Client
                    {validIncludedContacts.length !== 1 ? 's' : ''}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
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
    container: {
      backgroundColor: tokens.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '90%',
      minHeight: '60%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 16,
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
    headerTitleContainer: {
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: tokens.textPrimary,
    },
    headerSubtitle: {
      fontSize: 13,
      color: tokens.textSecondary,
      marginTop: 2,
    },
    statsBar: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: tokens.border,
    },
    statItem: {
      alignItems: 'center',
    },
    statValue: {
      fontSize: 20,
      fontWeight: '700',
      color: tokens.textPrimary,
    },
    statLabel: {
      fontSize: 12,
      color: tokens.textSecondary,
      marginTop: 2,
    },
    infoBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      paddingHorizontal: 16,
      paddingVertical: 10,
      gap: 10,
    },
    infoBannerText: {
      flex: 1,
      fontSize: 13,
      color: '#b45309',
    },
    contactsList: {
      flex: 1,
    },
    contactsListContent: {
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    contactRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: tokens.surface,
      borderRadius: 10,
      padding: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    contactRowExcluded: {
      opacity: 0.5,
    },
    contactRowInvalid: {
      borderColor: '#f59e0b',
    },
    checkboxContainer: {
      paddingTop: 2,
      paddingRight: 12,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxChecked: {
      backgroundColor: tokens.accent,
    },
    contactInfoContainer: {
      flex: 1,
    },
    contactDetails: {
      flex: 1,
    },
    contactName: {
      fontSize: 16,
      fontWeight: '600',
      color: tokens.textPrimary,
      marginBottom: 2,
    },
    contactDetailText: {
      fontSize: 13,
      color: tokens.textSecondary,
    },
    textExcluded: {
      color: tokens.muted,
    },
    textInvalid: {
      color: '#dc2626',
    },
    validationBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 6,
      gap: 4,
    },
    validationBadgeText: {
      fontSize: 12,
      color: '#f59e0b',
    },
    editButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: tokens.background,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: tokens.border,
    },
    editingContainer: {
      gap: 10,
    },
    editField: {
      gap: 4,
    },
    editLabel: {
      fontSize: 12,
      fontWeight: '500',
      color: tokens.textSecondary,
    },
    editInput: {
      backgroundColor: tokens.background,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: tokens.textPrimary,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    editInputInvalid: {
      borderColor: '#ef4444',
    },
    validationError: {
      fontSize: 12,
      color: '#ef4444',
    },
    doneEditingButton: {
      alignSelf: 'flex-end',
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: tokens.accent,
      borderRadius: 6,
      marginTop: 4,
    },
    doneEditingText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#ffffff',
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
    cancelButton: {
      backgroundColor: tokens.surface,
      borderWidth: 1,
      borderColor: tokens.border,
      flex: 0.4,
    },
    cancelButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: tokens.textSecondary,
    },
    createButton: {
      backgroundColor: tokens.accent,
      flex: 0.6,
    },
    createButtonDisabled: {
      opacity: 0.5,
    },
    createButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#ffffff',
    },
    progressContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
    },
    progressTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: tokens.textPrimary,
      marginTop: 20,
    },
    progressSubtitle: {
      fontSize: 14,
      color: tokens.textSecondary,
      marginTop: 8,
    },
    progressBarContainer: {
      width: '80%',
      height: 6,
      backgroundColor: tokens.surface,
      borderRadius: 3,
      marginTop: 20,
      overflow: 'hidden',
    },
    progressBar: {
      height: '100%',
      backgroundColor: tokens.accent,
      borderRadius: 3,
    },
    resultsContainer: {
      flex: 1,
      padding: 24,
    },
    resultsHeader: {
      alignItems: 'center',
      marginBottom: 24,
    },
    resultsIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    resultsTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: tokens.textPrimary,
      marginBottom: 8,
    },
    resultsSubtitle: {
      fontSize: 15,
      color: tokens.textSecondary,
      textAlign: 'center',
    },
    failedSection: {
      flex: 1,
      marginBottom: 16,
    },
    failedTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: tokens.textSecondary,
      marginBottom: 12,
    },
    failedList: {
      flex: 1,
    },
    failedItem: {
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderRadius: 8,
      padding: 12,
      marginBottom: 8,
    },
    failedName: {
      fontSize: 15,
      fontWeight: '600',
      color: tokens.textPrimary,
      marginBottom: 4,
    },
    failedError: {
      fontSize: 13,
      color: '#dc2626',
    },
    doneButton: {
      backgroundColor: tokens.accent,
      paddingVertical: 16,
      borderRadius: 10,
      alignItems: 'center',
    },
    doneButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#ffffff',
    },
  });
