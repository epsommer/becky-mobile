/**
 * HouseholdModal - Modal for managing household assignments
 *
 * Features:
 * - Create new household
 * - Add client to existing household
 * - View and manage household members
 * - Change primary contact
 * - Remove client from household
 * - Relationship role selection
 *
 * @module components/modals/HouseholdModal
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ThemeTokens, useTheme } from '../../theme/ThemeContext';
import {
  Household,
  HouseholdType,
  RelationshipRole,
  HouseholdMemberSummary,
  getHouseholdTypeLabel,
  getHouseholdTypeIcon,
  getRelationshipRoles,
  getMemberCountText,
} from '../../services/households';
import {
  useHouseholds,
  useClientHousehold,
  useHouseholdMutations,
} from '../../hooks/useHouseholds';

// ============================================================================
// Props & Types
// ============================================================================

export interface HouseholdModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Client ID we are managing household for */
  clientId: string;
  /** Client name for display */
  clientName: string;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Callback when household is updated (added/removed/changed) */
  onHouseholdUpdated?: () => void;
  /** Optional: Navigate to another client */
  onNavigateToClient?: (clientId: string) => void;
}

type ModalMode = 'view' | 'select' | 'create';

// ============================================================================
// Component
// ============================================================================

export default function HouseholdModal({
  visible,
  clientId,
  clientName,
  onClose,
  onHouseholdUpdated,
  onNavigateToClient,
}: HouseholdModalProps) {
  const { tokens } = useTheme();
  const styles = useMemo(() => createStyles(tokens), [tokens]);

  // Mode state
  const [mode, setMode] = useState<ModalMode>('view');

  // Form state for creating new household
  const [newHouseholdName, setNewHouseholdName] = useState('');
  const [newHouseholdType, setNewHouseholdType] = useState<HouseholdType>('FAMILY');

  // Form state for relationship
  const [relationshipRole, setRelationshipRole] = useState<RelationshipRole>('Primary Client');
  const [isPrimaryContact, setIsPrimaryContact] = useState(true);

  // Selected existing household
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<string | null>(null);

  // Data hooks
  const { household: clientHousehold, loading: loadingClientHousehold, refetch: refetchClientHousehold } =
    useClientHousehold(clientId);
  const { households, loading: loadingHouseholds, refetch: refetchHouseholds } = useHouseholds();
  const {
    createHousehold,
    addMember,
    removeMember,
    setPrimaryContact,
    loading: mutationLoading,
    error: mutationError,
  } = useHouseholdMutations();

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      // If client already has a household, show view mode
      if (clientHousehold) {
        setMode('view');
      } else {
        setMode('select');
      }

      // Pre-fill household name with client's last name
      const lastName = clientName.split(' ').pop() || clientName;
      setNewHouseholdName(`${lastName} Household`);

      // Reset other state
      setSelectedHouseholdId(null);
      setRelationshipRole('Primary Client');
      setIsPrimaryContact(true);
    }
  }, [visible, clientHousehold, clientName]);

  // Handle close
  const handleClose = useCallback(() => {
    if (!mutationLoading) {
      onClose();
    }
  }, [mutationLoading, onClose]);

  // Create new household and add client
  const handleCreateHousehold = useCallback(async () => {
    if (!newHouseholdName.trim()) {
      Alert.alert('Error', 'Please enter a household name');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const household = await createHousehold({
      name: newHouseholdName.trim(),
      accountType: newHouseholdType,
    });

    if (household) {
      // Add the current client to the new household
      const result = await addMember(household.id, {
        clientId,
        isPrimaryContact,
        relationshipRole,
      });

      if (result) {
        await refetchClientHousehold();
        onHouseholdUpdated?.();
        setMode('view');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  }, [
    newHouseholdName,
    newHouseholdType,
    clientId,
    isPrimaryContact,
    relationshipRole,
    createHousehold,
    addMember,
    refetchClientHousehold,
    onHouseholdUpdated,
  ]);

  // Add client to existing household
  const handleAddToHousehold = useCallback(async () => {
    if (!selectedHouseholdId) {
      Alert.alert('Error', 'Please select a household');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const result = await addMember(selectedHouseholdId, {
      clientId,
      isPrimaryContact,
      relationshipRole,
    });

    if (result) {
      await refetchClientHousehold();
      await refetchHouseholds();
      onHouseholdUpdated?.();
      setMode('view');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [
    selectedHouseholdId,
    clientId,
    isPrimaryContact,
    relationshipRole,
    addMember,
    refetchClientHousehold,
    refetchHouseholds,
    onHouseholdUpdated,
  ]);

  // Remove client from household
  const handleRemoveFromHousehold = useCallback(async () => {
    if (!clientHousehold) return;

    Alert.alert(
      'Remove from Household',
      `Are you sure you want to remove ${clientName} from ${clientHousehold.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            const result = await removeMember(clientHousehold.id, clientId);

            if (result) {
              await refetchClientHousehold();
              await refetchHouseholds();
              onHouseholdUpdated?.();
              setMode('select');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          },
        },
      ]
    );
  }, [
    clientHousehold,
    clientId,
    clientName,
    removeMember,
    refetchClientHousehold,
    refetchHouseholds,
    onHouseholdUpdated,
  ]);

  // Set client as primary contact
  const handleSetAsPrimary = useCallback(async () => {
    if (!clientHousehold) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const result = await setPrimaryContact(clientHousehold.id, clientId);

    if (result) {
      await refetchClientHousehold();
      onHouseholdUpdated?.();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [clientHousehold, clientId, setPrimaryContact, refetchClientHousehold, onHouseholdUpdated]);

  // Navigate to member client
  const handleNavigateToMember = useCallback(
    (member: HouseholdMemberSummary) => {
      if (member.id === clientId) return; // Don't navigate to self
      onClose();
      onNavigateToClient?.(member.id);
    },
    [clientId, onClose, onNavigateToClient]
  );

  // Loading state
  const isLoading = loadingClientHousehold || loadingHouseholds || mutationLoading;

  // Filter out households that client is already in
  const availableHouseholds = useMemo(() => {
    if (clientHousehold) {
      // Client is already in a household, show empty list
      return [];
    }
    // Show all available households
    return households;
  }, [households, clientHousehold]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="people" size={24} color={tokens.accent} />
              <Text style={styles.headerTitle}>Household</Text>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              disabled={mutationLoading}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={tokens.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Client Info */}
          <View style={styles.clientInfo}>
            <Text style={styles.clientName}>{clientName}</Text>
            {clientHousehold && (
              <View style={styles.householdBadge}>
                <Ionicons
                  name={getHouseholdTypeIcon(clientHousehold.accountType) as any}
                  size={14}
                  color={tokens.accent}
                />
                <Text style={styles.householdBadgeText}>{clientHousehold.name}</Text>
              </View>
            )}
          </View>

          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollContentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Loading State */}
            {isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={tokens.accent} />
                <Text style={styles.loadingText}>Loading...</Text>
              </View>
            )}

            {/* Error State */}
            {mutationError && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color="#ef4444" />
                <Text style={styles.errorText}>{mutationError}</Text>
              </View>
            )}

            {/* View Mode - Show current household */}
            {mode === 'view' && clientHousehold && !isLoading && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Current Household</Text>

                <View style={styles.householdCard}>
                  <View style={styles.householdCardHeader}>
                    <View style={styles.householdIconContainer}>
                      <Ionicons
                        name={getHouseholdTypeIcon(clientHousehold.accountType) as any}
                        size={28}
                        color={tokens.accent}
                      />
                    </View>
                    <View style={styles.householdCardInfo}>
                      <Text style={styles.householdName}>{clientHousehold.name}</Text>
                      <Text style={styles.householdType}>
                        {getHouseholdTypeLabel(clientHousehold.accountType)} -{' '}
                        {getMemberCountText(clientHousehold.memberCount)}
                      </Text>
                    </View>
                  </View>

                  {/* Members List */}
                  {clientHousehold.members && clientHousehold.members.length > 0 && (
                    <View style={styles.membersList}>
                      <Text style={styles.membersLabel}>Members</Text>
                      {clientHousehold.members.map((member) => (
                        <TouchableOpacity
                          key={member.id}
                          style={[
                            styles.memberRow,
                            member.id === clientId && styles.memberRowSelf,
                          ]}
                          onPress={() => handleNavigateToMember(member)}
                          disabled={member.id === clientId}
                        >
                          <View style={styles.memberInfo}>
                            <Text
                              style={[
                                styles.memberName,
                                member.id === clientId && styles.memberNameSelf,
                              ]}
                            >
                              {member.name}
                              {member.id === clientId && ' (You)'}
                            </Text>
                            <Text style={styles.memberRole}>
                              {member.relationshipRole || 'Member'}
                              {member.isPrimaryContact && ' - Primary Contact'}
                            </Text>
                          </View>
                          {member.id !== clientId && (
                            <Ionicons
                              name="chevron-forward"
                              size={18}
                              color={tokens.textSecondary}
                            />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Actions */}
                <View style={styles.actionsContainer}>
                  {clientHousehold.primaryContactId !== clientId && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={handleSetAsPrimary}
                      disabled={mutationLoading}
                    >
                      <Ionicons name="star" size={18} color={tokens.accent} />
                      <Text style={styles.actionButtonText}>Set as Primary Contact</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionButtonDanger]}
                    onPress={handleRemoveFromHousehold}
                    disabled={mutationLoading}
                  >
                    <Ionicons name="exit-outline" size={18} color="#ef4444" />
                    <Text style={[styles.actionButtonText, styles.actionButtonTextDanger]}>
                      Leave Household
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Select Mode - Choose existing or create new */}
            {mode === 'select' && !isLoading && (
              <View style={styles.section}>
                {/* Mode Toggle */}
                <View style={styles.modeToggle}>
                  <TouchableOpacity
                    style={[styles.modeButton, styles.modeButtonActive]}
                    onPress={() => setMode('select')}
                  >
                    <Text style={[styles.modeButtonText, styles.modeButtonTextActive]}>
                      Add to Existing
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modeButton]}
                    onPress={() => setMode('create')}
                  >
                    <Text style={[styles.modeButtonText]}>
                      Create New
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Existing Households List */}
                {availableHouseholds.length > 0 ? (
                  <View style={styles.householdsList}>
                    {availableHouseholds.map((household) => (
                      <TouchableOpacity
                        key={household.id}
                        style={[
                          styles.householdOption,
                          selectedHouseholdId === household.id && styles.householdOptionSelected,
                        ]}
                        onPress={() => {
                          setSelectedHouseholdId(household.id);
                          Haptics.selectionAsync();
                        }}
                      >
                        <View style={styles.householdOptionIcon}>
                          <Ionicons
                            name={getHouseholdTypeIcon(household.accountType) as any}
                            size={22}
                            color={
                              selectedHouseholdId === household.id
                                ? tokens.accent
                                : tokens.textSecondary
                            }
                          />
                        </View>
                        <View style={styles.householdOptionInfo}>
                          <Text style={styles.householdOptionName}>{household.name}</Text>
                          <Text style={styles.householdOptionMeta}>
                            {getHouseholdTypeLabel(household.accountType)} -{' '}
                            {getMemberCountText(household.memberCount)}
                          </Text>
                        </View>
                        {selectedHouseholdId === household.id && (
                          <Ionicons name="checkmark-circle" size={22} color={tokens.accent} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons name="home-outline" size={48} color={tokens.textSecondary} />
                    <Text style={styles.emptyStateText}>No households yet</Text>
                    <Text style={styles.emptyStateSubtext}>
                      Create a new household to group related clients
                    </Text>
                  </View>
                )}

                {/* Relationship Role */}
                {selectedHouseholdId && (
                  <View style={styles.roleSection}>
                    <Text style={styles.sectionTitle}>Relationship</Text>
                    <View style={styles.roleOptions}>
                      {getRelationshipRoles().map((role) => (
                        <TouchableOpacity
                          key={role}
                          style={[
                            styles.roleOption,
                            relationshipRole === role && styles.roleOptionSelected,
                          ]}
                          onPress={() => {
                            setRelationshipRole(role);
                            Haptics.selectionAsync();
                          }}
                        >
                          <Text
                            style={[
                              styles.roleOptionText,
                              relationshipRole === role && styles.roleOptionTextSelected,
                            ]}
                          >
                            {role}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Primary Contact Toggle */}
                    <TouchableOpacity
                      style={styles.primaryToggle}
                      onPress={() => {
                        setIsPrimaryContact(!isPrimaryContact);
                        Haptics.selectionAsync();
                      }}
                    >
                      <Ionicons
                        name={isPrimaryContact ? 'checkbox' : 'square-outline'}
                        size={22}
                        color={isPrimaryContact ? tokens.accent : tokens.textSecondary}
                      />
                      <Text style={styles.primaryToggleText}>
                        Set as Primary Contact
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* Create Mode - New household form */}
            {mode === 'create' && !isLoading && (
              <View style={styles.section}>
                {/* Mode Toggle */}
                <View style={styles.modeToggle}>
                  <TouchableOpacity
                    style={[styles.modeButton]}
                    onPress={() => setMode('select')}
                  >
                    <Text style={[styles.modeButtonText]}>
                      Add to Existing
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modeButton, styles.modeButtonActive]}
                    onPress={() => setMode('create')}
                  >
                    <Text style={[styles.modeButtonText, styles.modeButtonTextActive]}>
                      Create New
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Household Name */}
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Household Name</Text>
                  <TextInput
                    style={styles.textInput}
                    value={newHouseholdName}
                    onChangeText={setNewHouseholdName}
                    placeholder="e.g., Smith Household"
                    placeholderTextColor={tokens.textSecondary}
                  />
                </View>

                {/* Household Type */}
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Account Type</Text>
                  <View style={styles.typeOptions}>
                    {(['PERSONAL', 'FAMILY', 'BUSINESS', 'ORGANIZATION'] as HouseholdType[]).map(
                      (type) => (
                        <TouchableOpacity
                          key={type}
                          style={[
                            styles.typeOption,
                            newHouseholdType === type && styles.typeOptionSelected,
                          ]}
                          onPress={() => {
                            setNewHouseholdType(type);
                            Haptics.selectionAsync();
                          }}
                        >
                          <Ionicons
                            name={getHouseholdTypeIcon(type) as any}
                            size={20}
                            color={
                              newHouseholdType === type ? tokens.accent : tokens.textSecondary
                            }
                          />
                          <Text
                            style={[
                              styles.typeOptionText,
                              newHouseholdType === type && styles.typeOptionTextSelected,
                            ]}
                          >
                            {getHouseholdTypeLabel(type)}
                          </Text>
                        </TouchableOpacity>
                      )
                    )}
                  </View>
                </View>

                {/* Relationship Role */}
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Your Role</Text>
                  <View style={styles.roleOptions}>
                    {getRelationshipRoles().map((role) => (
                      <TouchableOpacity
                        key={role}
                        style={[
                          styles.roleOption,
                          relationshipRole === role && styles.roleOptionSelected,
                        ]}
                        onPress={() => {
                          setRelationshipRole(role);
                          Haptics.selectionAsync();
                        }}
                      >
                        <Text
                          style={[
                            styles.roleOptionText,
                            relationshipRole === role && styles.roleOptionTextSelected,
                          ]}
                        >
                          {role}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Primary Contact Toggle */}
                <TouchableOpacity
                  style={styles.primaryToggle}
                  onPress={() => {
                    setIsPrimaryContact(!isPrimaryContact);
                    Haptics.selectionAsync();
                  }}
                >
                  <Ionicons
                    name={isPrimaryContact ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={isPrimaryContact ? tokens.accent : tokens.textSecondary}
                  />
                  <Text style={styles.primaryToggleText}>
                    Set as Primary Contact
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {/* Footer Actions */}
          {!isLoading && (
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleClose}
                disabled={mutationLoading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              {mode === 'select' && selectedHouseholdId && (
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    mutationLoading && styles.submitButtonDisabled,
                  ]}
                  onPress={handleAddToHousehold}
                  disabled={mutationLoading}
                >
                  {mutationLoading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons name="add" size={18} color="#ffffff" />
                      <Text style={styles.submitButtonText}>Add to Household</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {mode === 'create' && (
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    mutationLoading && styles.submitButtonDisabled,
                  ]}
                  onPress={handleCreateHousehold}
                  disabled={mutationLoading || !newHouseholdName.trim()}
                >
                  {mutationLoading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons name="add-circle" size={18} color="#ffffff" />
                      <Text style={styles.submitButtonText}>Create Household</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {mode === 'view' && (
                <TouchableOpacity
                  style={styles.doneButton}
                  onPress={handleClose}
                >
                  <Text style={styles.doneButtonText}>Done</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ============================================================================
// Styles
// ============================================================================

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    container: {
      backgroundColor: tokens.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '90%',
      // Neomorphic shadow
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 16,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: tokens.border,
    },
    headerTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: tokens.textPrimary,
    },
    closeButton: {
      padding: 4,
    },
    clientInfo: {
      paddingHorizontal: 20,
      paddingVertical: 12,
      backgroundColor: tokens.surface,
      borderBottomWidth: 1,
      borderBottomColor: tokens.border,
    },
    clientName: {
      fontSize: 16,
      fontWeight: '600',
      color: tokens.textPrimary,
    },
    householdBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 6,
      paddingVertical: 4,
      paddingHorizontal: 10,
      backgroundColor: tokens.accent + '15',
      borderRadius: 12,
      alignSelf: 'flex-start',
    },
    householdBadgeText: {
      fontSize: 13,
      fontWeight: '500',
      color: tokens.accent,
    },
    scrollContent: {
      flex: 1,
    },
    scrollContentContainer: {
      padding: 20,
      paddingBottom: 32,
    },
    loadingContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 14,
      color: tokens.textSecondary,
    },
    errorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 12,
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderRadius: 10,
      marginBottom: 16,
    },
    errorText: {
      fontSize: 14,
      color: '#dc2626',
      flex: 1,
    },
    section: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: tokens.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 12,
    },
    modeToggle: {
      flexDirection: 'row',
      backgroundColor: tokens.surface,
      borderRadius: 12,
      padding: 4,
      marginBottom: 20,
    },
    modeButton: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 10,
      alignItems: 'center',
    },
    modeButtonActive: {
      backgroundColor: tokens.accent,
    },
    modeButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: tokens.textSecondary,
    },
    modeButtonTextActive: {
      color: '#ffffff',
    },
    householdCard: {
      backgroundColor: tokens.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    householdCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    householdIconContainer: {
      width: 52,
      height: 52,
      borderRadius: 14,
      backgroundColor: tokens.accent + '15',
      justifyContent: 'center',
      alignItems: 'center',
    },
    householdCardInfo: {
      flex: 1,
    },
    householdName: {
      fontSize: 18,
      fontWeight: '700',
      color: tokens.textPrimary,
    },
    householdType: {
      fontSize: 14,
      color: tokens.textSecondary,
      marginTop: 2,
    },
    membersList: {
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: tokens.border,
    },
    membersLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: tokens.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 10,
    },
    memberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: tokens.background,
      borderRadius: 10,
      marginBottom: 6,
    },
    memberRowSelf: {
      backgroundColor: tokens.accent + '10',
      borderWidth: 1,
      borderColor: tokens.accent + '30',
    },
    memberInfo: {
      flex: 1,
    },
    memberName: {
      fontSize: 15,
      fontWeight: '600',
      color: tokens.textPrimary,
    },
    memberNameSelf: {
      color: tokens.accent,
    },
    memberRole: {
      fontSize: 13,
      color: tokens.textSecondary,
      marginTop: 2,
    },
    actionsContainer: {
      marginTop: 16,
      gap: 10,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: tokens.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    actionButtonDanger: {
      borderColor: 'rgba(239, 68, 68, 0.3)',
      backgroundColor: 'rgba(239, 68, 68, 0.05)',
    },
    actionButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: tokens.textPrimary,
    },
    actionButtonTextDanger: {
      color: '#ef4444',
    },
    householdsList: {
      gap: 8,
    },
    householdOption: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      backgroundColor: tokens.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    householdOptionSelected: {
      borderColor: tokens.accent,
      backgroundColor: tokens.accent + '08',
    },
    householdOptionIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: tokens.background,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    householdOptionInfo: {
      flex: 1,
    },
    householdOptionName: {
      fontSize: 16,
      fontWeight: '600',
      color: tokens.textPrimary,
    },
    householdOptionMeta: {
      fontSize: 13,
      color: tokens.textSecondary,
      marginTop: 2,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 40,
    },
    emptyStateText: {
      fontSize: 16,
      fontWeight: '600',
      color: tokens.textPrimary,
      marginTop: 16,
    },
    emptyStateSubtext: {
      fontSize: 14,
      color: tokens.textSecondary,
      marginTop: 6,
      textAlign: 'center',
    },
    roleSection: {
      marginTop: 20,
    },
    roleOptions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    roleOption: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      backgroundColor: tokens.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    roleOptionSelected: {
      borderColor: tokens.accent,
      backgroundColor: tokens.accent + '15',
    },
    roleOptionText: {
      fontSize: 14,
      fontWeight: '500',
      color: tokens.textSecondary,
    },
    roleOptionTextSelected: {
      color: tokens.accent,
    },
    primaryToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 12,
      marginTop: 16,
    },
    primaryToggleText: {
      fontSize: 15,
      fontWeight: '500',
      color: tokens.textPrimary,
    },
    formField: {
      marginBottom: 20,
    },
    fieldLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: tokens.textSecondary,
      marginBottom: 10,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    textInput: {
      backgroundColor: tokens.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: tokens.border,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: tokens.textPrimary,
    },
    typeOptions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    typeOption: {
      flex: 1,
      minWidth: 140,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 14,
      backgroundColor: tokens.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    typeOptionSelected: {
      borderColor: tokens.accent,
      backgroundColor: tokens.accent + '10',
    },
    typeOptionText: {
      fontSize: 14,
      fontWeight: '500',
      color: tokens.textSecondary,
    },
    typeOptionTextSelected: {
      color: tokens.accent,
    },
    footer: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderTopWidth: 1,
      borderTopColor: tokens.border,
      backgroundColor: tokens.background,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: 14,
      paddingHorizontal: 20,
      backgroundColor: tokens.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: tokens.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: tokens.textSecondary,
    },
    submitButton: {
      flex: 1.5,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      paddingHorizontal: 20,
      backgroundColor: tokens.accent,
      borderRadius: 12,
    },
    submitButtonDisabled: {
      opacity: 0.6,
    },
    submitButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#ffffff',
    },
    doneButton: {
      flex: 1.5,
      paddingVertical: 14,
      paddingHorizontal: 20,
      backgroundColor: tokens.accent,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    doneButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#ffffff',
    },
  });
