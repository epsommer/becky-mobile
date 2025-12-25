/**
 * TestimonialDetailModal - Full testimonial details with edit capabilities
 *
 * Features:
 * - Full testimonial content display
 * - Edit mode for content adjustments
 * - Approve/reject actions
 * - Featured/visibility toggles
 * - Delete with confirmation
 * - Service line association
 */
"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemeTokens, useTheme } from "../../theme/ThemeContext";
import { Testimonial } from "../../lib/api/endpoints/testimonials";
import DeleteConfirmationModal from "../modals/DeleteConfirmationModal";

interface TestimonialDetailModalProps {
  visible: boolean;
  testimonial: Testimonial | null;
  onClose: () => void;
  onApprove: (id: string) => Promise<boolean>;
  onReject: (id: string, reason?: string) => Promise<boolean>;
  onToggleFeatured: (id: string, isFeatured: boolean) => Promise<boolean>;
  onToggleVisibility: (id: string, isPublic: boolean) => Promise<boolean>;
  onUpdate: (id: string, data: Partial<Testimonial>) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

export default function TestimonialDetailModal({
  visible,
  testimonial,
  onClose,
  onApprove,
  onReject,
  onToggleFeatured,
  onToggleVisibility,
  onUpdate,
  onDelete,
}: TestimonialDetailModalProps) {
  const { tokens } = useTheme();
  const styles = useMemo(() => createStyles(tokens), [tokens]);

  // State
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedContent, setEditedContent] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Reset state when modal opens/closes or testimonial changes
  useEffect(() => {
    if (visible && testimonial) {
      setEditedTitle(testimonial.title || "");
      setEditedContent(testimonial.content || "");
      setIsEditing(false);
      setRejectReason("");
    }
  }, [visible, testimonial]);

  if (!testimonial) return null;

  // Format date
  const formatDate = (date: Date | undefined) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  // Render star rating
  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= rating ? "star" : "star-outline"}
          size={20}
          color={i <= rating ? "#FFD700" : tokens.textSecondary}
        />
      );
    }
    return stars;
  };

  // Get status badge config
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "APPROVED":
        return {
          label: "Approved",
          color: "#10b981",
          bgColor: "rgba(16, 185, 129, 0.15)",
          icon: "checkmark-circle" as const,
        };
      case "REJECTED":
        return {
          label: "Rejected",
          color: "#ef4444",
          bgColor: "rgba(239, 68, 68, 0.15)",
          icon: "close-circle" as const,
        };
      case "PENDING":
      default:
        return {
          label: "Pending Review",
          color: "#f59e0b",
          bgColor: "rgba(245, 158, 11, 0.15)",
          icon: "time" as const,
        };
    }
  };

  const statusConfig = getStatusConfig(testimonial.status);
  const isApproved = testimonial.status === "APPROVED";
  const isPending = testimonial.status === "PENDING";

  // Handle save edits
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const success = await onUpdate(testimonial.id, {
        title: editedTitle || undefined,
        content: editedContent,
      });
      if (success) {
        setIsEditing(false);
        Alert.alert("Success", "Testimonial updated successfully");
      } else {
        Alert.alert("Error", "Failed to update testimonial");
      }
    } catch (err) {
      Alert.alert("Error", "An error occurred while updating");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle approve
  const handleApprove = async () => {
    setIsSaving(true);
    try {
      const success = await onApprove(testimonial.id);
      if (success) {
        Alert.alert("Success", "Testimonial approved");
      } else {
        Alert.alert("Error", "Failed to approve testimonial");
      }
    } catch (err) {
      Alert.alert("Error", "An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle reject
  const handleReject = async () => {
    setIsSaving(true);
    try {
      const success = await onReject(testimonial.id, rejectReason || undefined);
      if (success) {
        setShowRejectModal(false);
        setRejectReason("");
        Alert.alert("Success", "Testimonial rejected");
      } else {
        Alert.alert("Error", "Failed to reject testimonial");
      }
    } catch (err) {
      Alert.alert("Error", "An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    try {
      const success = await onDelete(testimonial.id);
      if (success) {
        setShowDeleteModal(false);
        onClose();
      } else {
        Alert.alert("Error", "Failed to delete testimonial");
      }
    } catch (err) {
      Alert.alert("Error", "An error occurred");
    }
  };

  // Handle toggle featured
  const handleToggleFeatured = async (value: boolean) => {
    const success = await onToggleFeatured(testimonial.id, value);
    if (!success) {
      Alert.alert("Error", "Failed to update featured status");
    }
  };

  // Handle toggle visibility
  const handleToggleVisibility = async (value: boolean) => {
    const success = await onToggleVisibility(testimonial.id, value);
    if (!success) {
      Alert.alert("Error", "Failed to update visibility");
    }
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.overlay}
        >
          <View style={styles.modalContainer}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={tokens.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Testimonial Details</Text>
              <View style={styles.headerActions}>
                {!isEditing && (
                  <TouchableOpacity
                    onPress={() => setIsEditing(true)}
                    style={styles.headerAction}
                  >
                    <Ionicons name="pencil" size={20} color={tokens.accent} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => setShowDeleteModal(true)}
                  style={styles.headerAction}
                >
                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.scrollContentContainer}
              showsVerticalScrollIndicator={false}
            >
              {/* Status badge */}
              <View style={[styles.statusBadgeLarge, { backgroundColor: statusConfig.bgColor }]}>
                <Ionicons name={statusConfig.icon} size={18} color={statusConfig.color} />
                <Text style={[styles.statusTextLarge, { color: statusConfig.color }]}>
                  {statusConfig.label}
                </Text>
              </View>

              {/* Client info section */}
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: tokens.textSecondary }]}>
                  CLIENT
                </Text>
                <View style={styles.clientCard}>
                  <View style={[styles.avatar, { backgroundColor: tokens.surface }]}>
                    <Text style={[styles.avatarText, { color: tokens.accent }]}>
                      {testimonial.client?.name?.charAt(0)?.toUpperCase() || "?"}
                    </Text>
                  </View>
                  <View style={styles.clientDetails}>
                    <Text style={[styles.clientName, { color: tokens.textPrimary }]}>
                      {testimonial.client?.name || "Anonymous"}
                    </Text>
                    {testimonial.client?.email && (
                      <Text style={[styles.clientEmail, { color: tokens.textSecondary }]}>
                        {testimonial.client.email}
                      </Text>
                    )}
                    {testimonial.client?.company && (
                      <Text style={[styles.clientCompany, { color: tokens.textSecondary }]}>
                        {testimonial.client.company}
                      </Text>
                    )}
                  </View>
                </View>
              </View>

              {/* Rating */}
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: tokens.textSecondary }]}>
                  RATING
                </Text>
                <View style={styles.starsContainer}>{renderStars(testimonial.rating)}</View>
              </View>

              {/* Service */}
              {testimonial.serviceName && (
                <View style={styles.section}>
                  <Text style={[styles.sectionLabel, { color: tokens.textSecondary }]}>
                    SERVICE
                  </Text>
                  <Text style={[styles.serviceText, { color: tokens.textPrimary }]}>
                    {testimonial.serviceName}
                  </Text>
                </View>
              )}

              {/* Date */}
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: tokens.textSecondary }]}>
                  SUBMITTED
                </Text>
                <Text style={[styles.dateText, { color: tokens.textPrimary }]}>
                  {formatDate(testimonial.submittedAt || testimonial.createdAt)}
                </Text>
              </View>

              {/* Title */}
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: tokens.textSecondary }]}>
                  TITLE
                </Text>
                {isEditing ? (
                  <TextInput
                    style={[styles.input, { color: tokens.textPrimary, borderColor: tokens.border }]}
                    value={editedTitle}
                    onChangeText={setEditedTitle}
                    placeholder="Optional title..."
                    placeholderTextColor={tokens.textSecondary}
                  />
                ) : (
                  <Text style={[styles.titleText, { color: tokens.textPrimary }]}>
                    {testimonial.title || "No title"}
                  </Text>
                )}
              </View>

              {/* Content */}
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: tokens.textSecondary }]}>
                  TESTIMONIAL
                </Text>
                {isEditing ? (
                  <TextInput
                    style={[
                      styles.input,
                      styles.contentInput,
                      { color: tokens.textPrimary, borderColor: tokens.border },
                    ]}
                    value={editedContent}
                    onChangeText={setEditedContent}
                    placeholder="Testimonial content..."
                    placeholderTextColor={tokens.textSecondary}
                    multiline
                    textAlignVertical="top"
                  />
                ) : (
                  <Text style={[styles.contentText, { color: tokens.textPrimary }]}>
                    {testimonial.content}
                  </Text>
                )}
              </View>

              {/* Edit save/cancel buttons */}
              {isEditing && (
                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={[styles.editButton, styles.cancelEditButton, { borderColor: tokens.border }]}
                    onPress={() => {
                      setIsEditing(false);
                      setEditedTitle(testimonial.title || "");
                      setEditedContent(testimonial.content || "");
                    }}
                    disabled={isSaving}
                  >
                    <Text style={[styles.editButtonText, { color: tokens.textSecondary }]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.editButton, styles.saveEditButton, { backgroundColor: tokens.accent }]}
                    onPress={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={[styles.editButtonText, { color: "#fff" }]}>
                        Save Changes
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* Toggles for approved testimonials */}
              {isApproved && !isEditing && (
                <View style={styles.section}>
                  <Text style={[styles.sectionLabel, { color: tokens.textSecondary }]}>
                    VISIBILITY OPTIONS
                  </Text>
                  <View style={styles.togglesContainer}>
                    <View style={styles.toggleRow}>
                      <View style={styles.toggleLabelRow}>
                        <Ionicons name="ribbon" size={18} color="#8b5cf6" />
                        <View>
                          <Text style={[styles.toggleTitle, { color: tokens.textPrimary }]}>
                            Featured
                          </Text>
                          <Text style={[styles.toggleDescription, { color: tokens.textSecondary }]}>
                            Highlight on your website
                          </Text>
                        </View>
                      </View>
                      <Switch
                        value={testimonial.isFeatured}
                        onValueChange={handleToggleFeatured}
                        trackColor={{ false: tokens.border, true: "#8b5cf6" }}
                        thumbColor="#ffffff"
                      />
                    </View>

                    <View style={[styles.toggleDivider, { backgroundColor: tokens.border }]} />

                    <View style={styles.toggleRow}>
                      <View style={styles.toggleLabelRow}>
                        <Ionicons name="globe" size={18} color="#3b82f6" />
                        <View>
                          <Text style={[styles.toggleTitle, { color: tokens.textPrimary }]}>
                            Public
                          </Text>
                          <Text style={[styles.toggleDescription, { color: tokens.textSecondary }]}>
                            Visible to everyone
                          </Text>
                        </View>
                      </View>
                      <Switch
                        value={testimonial.isPublic}
                        onValueChange={handleToggleVisibility}
                        trackColor={{ false: tokens.border, true: "#3b82f6" }}
                        thumbColor="#ffffff"
                      />
                    </View>
                  </View>
                </View>
              )}

              {/* Approval actions for pending */}
              {isPending && !isEditing && (
                <View style={styles.approvalActions}>
                  <TouchableOpacity
                    style={[styles.approvalButton, styles.rejectApprovalButton]}
                    onPress={() => setShowRejectModal(true)}
                    disabled={isSaving}
                  >
                    <Ionicons name="close-circle" size={22} color="#ef4444" />
                    <Text style={[styles.approvalButtonText, { color: "#ef4444" }]}>
                      Reject
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.approvalButton, styles.approveApprovalButton]}
                    onPress={handleApprove}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color="#10b981" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={22} color="#10b981" />
                        <Text style={[styles.approvalButtonText, { color: "#10b981" }]}>
                          Approve
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Reject confirmation modal with reason input */}
      <Modal
        visible={showRejectModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={styles.rejectOverlay}>
          <View style={[styles.rejectModal, { backgroundColor: tokens.background }]}>
            <View style={styles.rejectHeader}>
              <Ionicons name="close-circle" size={40} color="#ef4444" />
              <Text style={[styles.rejectTitle, { color: tokens.textPrimary }]}>
                Reject Testimonial?
              </Text>
            </View>

            <Text style={[styles.rejectMessage, { color: tokens.textSecondary }]}>
              This testimonial will be marked as rejected and won't be visible to the public.
            </Text>

            <TextInput
              style={[styles.rejectReasonInput, { color: tokens.textPrimary, borderColor: tokens.border }]}
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Optional: Add a reason for rejection..."
              placeholderTextColor={tokens.textSecondary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <View style={styles.rejectActions}>
              <TouchableOpacity
                style={[styles.rejectButton, styles.rejectCancelButton, { borderColor: tokens.border }]}
                onPress={() => {
                  setShowRejectModal(false);
                  setRejectReason("");
                }}
                disabled={isSaving}
              >
                <Text style={[styles.rejectButtonText, { color: tokens.textSecondary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.rejectButton, styles.rejectConfirmButton]}
                onPress={handleReject}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.rejectButtonText, { color: "#fff" }]}>
                    Reject
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete confirmation modal */}
      <DeleteConfirmationModal
        visible={showDeleteModal}
        title="Delete Testimonial?"
        message="This testimonial will be permanently removed."
        itemName={testimonial.client?.name ? `Testimonial from ${testimonial.client.name}` : undefined}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </>
  );
}

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      justifyContent: "flex-end",
    },
    modalContainer: {
      backgroundColor: tokens.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: "90%",
      paddingBottom: Platform.OS === "ios" ? 34 : 20,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: tokens.border,
    },
    closeButton: {
      padding: 4,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: tokens.textPrimary,
      fontFamily: "Bytesized-Regular",
      textTransform: "uppercase",
    },
    headerActions: {
      flexDirection: "row",
      gap: 12,
    },
    headerAction: {
      padding: 4,
    },
    content: {
      padding: 16,
    },
    scrollContentContainer: {
      paddingBottom: 40,
    },
    statusBadgeLarge: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 16,
      gap: 8,
      marginBottom: 20,
    },
    statusTextLarge: {
      fontSize: 13,
      fontWeight: "700",
      fontFamily: "lores-9-wide",
      textTransform: "uppercase",
    },
    section: {
      marginBottom: 20,
    },
    sectionLabel: {
      fontSize: 10,
      fontWeight: "700",
      fontFamily: "lores-9-wide",
      textTransform: "uppercase",
      letterSpacing: 1,
      marginBottom: 8,
    },
    clientCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    avatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      fontSize: 20,
      fontWeight: "700",
      fontFamily: "Bytesized-Regular",
    },
    clientDetails: {
      flex: 1,
    },
    clientName: {
      fontSize: 16,
      fontWeight: "700",
      fontFamily: "lores-9-wide",
      marginBottom: 2,
    },
    clientEmail: {
      fontSize: 12,
      fontFamily: "lores-9-wide",
    },
    clientCompany: {
      fontSize: 12,
      fontFamily: "lores-9-wide",
      fontStyle: "italic",
    },
    starsContainer: {
      flexDirection: "row",
      gap: 4,
    },
    serviceText: {
      fontSize: 14,
      fontFamily: "lores-9-wide",
    },
    dateText: {
      fontSize: 14,
      fontFamily: "lores-9-wide",
    },
    titleText: {
      fontSize: 15,
      fontWeight: "700",
      fontFamily: "lores-9-wide",
    },
    contentText: {
      fontSize: 14,
      lineHeight: 22,
      fontFamily: "lores-9-wide",
    },
    input: {
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      fontSize: 14,
      fontFamily: "lores-9-wide",
    },
    contentInput: {
      minHeight: 120,
    },
    editActions: {
      flexDirection: "row",
      gap: 12,
      marginTop: 8,
    },
    editButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    cancelEditButton: {
      borderWidth: 1,
    },
    saveEditButton: {},
    editButtonText: {
      fontSize: 13,
      fontWeight: "700",
      fontFamily: "lores-9-wide",
      textTransform: "uppercase",
    },
    togglesContainer: {
      backgroundColor: tokens.surface,
      borderRadius: 12,
      padding: 4,
    },
    toggleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 12,
    },
    toggleLabelRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    toggleTitle: {
      fontSize: 14,
      fontWeight: "600",
      fontFamily: "lores-9-wide",
    },
    toggleDescription: {
      fontSize: 11,
      fontFamily: "lores-9-wide",
    },
    toggleDivider: {
      height: 1,
      marginHorizontal: 12,
    },
    approvalActions: {
      flexDirection: "row",
      gap: 12,
      marginTop: 8,
    },
    approvalButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 14,
      borderRadius: 12,
      gap: 8,
    },
    rejectApprovalButton: {
      backgroundColor: "rgba(239, 68, 68, 0.1)",
      borderWidth: 1,
      borderColor: "rgba(239, 68, 68, 0.3)",
    },
    approveApprovalButton: {
      backgroundColor: "rgba(16, 185, 129, 0.1)",
      borderWidth: 1,
      borderColor: "rgba(16, 185, 129, 0.3)",
    },
    approvalButtonText: {
      fontSize: 14,
      fontWeight: "700",
      fontFamily: "lores-9-wide",
      textTransform: "uppercase",
    },
    // Reject modal styles
    rejectOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    rejectModal: {
      width: "100%",
      maxWidth: 340,
      borderRadius: 16,
      padding: 24,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
    },
    rejectHeader: {
      alignItems: "center",
      marginBottom: 16,
    },
    rejectTitle: {
      fontSize: 18,
      fontWeight: "700",
      fontFamily: "Bytesized-Regular",
      marginTop: 12,
    },
    rejectMessage: {
      fontSize: 14,
      fontFamily: "lores-9-wide",
      textAlign: "center",
      lineHeight: 20,
      marginBottom: 16,
    },
    rejectReasonInput: {
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      fontSize: 14,
      fontFamily: "lores-9-wide",
      minHeight: 80,
      marginBottom: 16,
    },
    rejectActions: {
      flexDirection: "row",
      gap: 12,
    },
    rejectButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    rejectCancelButton: {
      borderWidth: 1,
    },
    rejectConfirmButton: {
      backgroundColor: "#ef4444",
    },
    rejectButtonText: {
      fontSize: 14,
      fontWeight: "600",
      fontFamily: "lores-9-wide",
    },
  });
