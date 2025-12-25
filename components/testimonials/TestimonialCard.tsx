/**
 * TestimonialCard - Enhanced testimonial card with approval workflow
 *
 * Features:
 * - Star rating display
 * - Status badge (pending, approved, rejected)
 * - Client name/photo placeholder
 * - Expandable testimonial text
 * - Submitted date
 * - Quick approve/reject buttons
 * - Featured toggle (only for approved)
 * - Public/private toggle (only for approved)
 * - Selection mode support
 * - Tap to view details
 */
"use client";

import React, { useState, useMemo } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Switch,
  Animated,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemeTokens, useTheme } from "../../theme/ThemeContext";
import { Testimonial } from "../../lib/api/endpoints/testimonials";

interface TestimonialCardProps {
  testimonial: Testimonial;
  onPress?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onToggleFeatured?: (isFeatured: boolean) => void;
  onToggleVisibility?: (isPublic: boolean) => void;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  selectionMode?: boolean;
  disabled?: boolean;
}

export default function TestimonialCard({
  testimonial,
  onPress,
  onApprove,
  onReject,
  onToggleFeatured,
  onToggleVisibility,
  isSelected = false,
  onToggleSelect,
  selectionMode = false,
  disabled = false,
}: TestimonialCardProps) {
  const { tokens } = useTheme();
  const styles = useMemo(() => createStyles(tokens), [tokens]);
  const [expanded, setExpanded] = useState(false);

  // Format date
  const formatDate = (date: Date | undefined) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
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
          size={16}
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
          label: "Pending",
          color: "#f59e0b",
          bgColor: "rgba(245, 158, 11, 0.15)",
          icon: "time" as const,
        };
    }
  };

  const statusConfig = getStatusConfig(testimonial.status);
  const isApproved = testimonial.status === "APPROVED";
  const isPending = testimonial.status === "PENDING";
  const contentTooLong = (testimonial.content?.length || 0) > 150;

  const handlePress = () => {
    if (selectionMode && onToggleSelect) {
      onToggleSelect();
    } else if (onPress) {
      onPress();
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={onToggleSelect}
      style={[
        styles.card,
        testimonial.isFeatured && styles.featuredCard,
        isSelected && styles.selectedCard,
        disabled && styles.disabledCard,
      ]}
      disabled={disabled}
    >
      {/* Selection checkbox */}
      {selectionMode && (
        <View style={styles.checkboxContainer}>
          <View
            style={[
              styles.checkbox,
              isSelected && styles.checkboxSelected,
            ]}
          >
            {isSelected && (
              <Ionicons name="checkmark" size={16} color="#fff" />
            )}
          </View>
        </View>
      )}

      {/* Header row: client info + status */}
      <View style={styles.headerRow}>
        {/* Client avatar placeholder */}
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, { backgroundColor: tokens.surface }]}>
            <Text style={[styles.avatarText, { color: tokens.accent }]}>
              {testimonial.client?.name?.charAt(0)?.toUpperCase() || "?"}
            </Text>
          </View>
        </View>

        {/* Client info */}
        <View style={styles.clientInfo}>
          <Text style={[styles.clientName, { color: tokens.textPrimary }]}>
            {testimonial.client?.name || "Anonymous"}
          </Text>
          {testimonial.client?.company && (
            <Text style={[styles.clientCompany, { color: tokens.textSecondary }]}>
              {testimonial.client.company}
            </Text>
          )}
          <Text style={[styles.date, { color: tokens.textSecondary }]}>
            {formatDate(testimonial.submittedAt || testimonial.createdAt)}
          </Text>
        </View>

        {/* Status badge */}
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
          <Ionicons name={statusConfig.icon} size={12} color={statusConfig.color} />
          <Text style={[styles.statusText, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
        </View>
      </View>

      {/* Star rating */}
      <View style={styles.ratingRow}>
        <View style={styles.starsContainer}>{renderStars(testimonial.rating)}</View>
        {testimonial.serviceName && (
          <Text style={[styles.serviceName, { color: tokens.textSecondary }]}>
            {testimonial.serviceName}
          </Text>
        )}
      </View>

      {/* Featured/Public indicators */}
      {isApproved && (testimonial.isFeatured || testimonial.isPublic) && (
        <View style={styles.indicatorRow}>
          {testimonial.isFeatured && (
            <View style={[styles.indicator, { backgroundColor: "rgba(139, 92, 246, 0.15)" }]}>
              <Ionicons name="ribbon" size={12} color="#8b5cf6" />
              <Text style={[styles.indicatorText, { color: "#8b5cf6" }]}>Featured</Text>
            </View>
          )}
          {testimonial.isPublic && (
            <View style={[styles.indicator, { backgroundColor: "rgba(59, 130, 246, 0.15)" }]}>
              <Ionicons name="globe" size={12} color="#3b82f6" />
              <Text style={[styles.indicatorText, { color: "#3b82f6" }]}>Public</Text>
            </View>
          )}
        </View>
      )}

      {/* Title */}
      {testimonial.title && (
        <Text style={[styles.title, { color: tokens.textPrimary }]}>
          {testimonial.title}
        </Text>
      )}

      {/* Content */}
      <TouchableOpacity
        onPress={() => contentTooLong && setExpanded(!expanded)}
        activeOpacity={contentTooLong ? 0.7 : 1}
      >
        <Text
          style={[styles.content, { color: tokens.textSecondary }]}
          numberOfLines={expanded ? undefined : 3}
        >
          {testimonial.content}
        </Text>
        {contentTooLong && (
          <Text style={[styles.expandToggle, { color: tokens.accent }]}>
            {expanded ? "Show less" : "Show more"}
          </Text>
        )}
      </TouchableOpacity>

      {/* Action buttons for pending testimonials */}
      {isPending && !selectionMode && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={onReject}
            disabled={disabled}
          >
            <Ionicons name="close" size={18} color="#ef4444" />
            <Text style={[styles.actionButtonText, { color: "#ef4444" }]}>
              Reject
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={onApprove}
            disabled={disabled}
          >
            <Ionicons name="checkmark" size={18} color="#10b981" />
            <Text style={[styles.actionButtonText, { color: "#10b981" }]}>
              Approve
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Toggle switches for approved testimonials */}
      {isApproved && !selectionMode && (
        <View style={styles.toggleRow}>
          <View style={styles.toggleItem}>
            <View style={styles.toggleLabelRow}>
              <Ionicons name="ribbon" size={14} color="#8b5cf6" />
              <Text style={[styles.toggleLabel, { color: tokens.textSecondary }]}>
                Featured
              </Text>
            </View>
            <Switch
              value={testimonial.isFeatured}
              onValueChange={onToggleFeatured}
              trackColor={{ false: tokens.border, true: "#8b5cf6" }}
              thumbColor="#ffffff"
              disabled={disabled}
            />
          </View>

          <View style={styles.toggleDivider} />

          <View style={styles.toggleItem}>
            <View style={styles.toggleLabelRow}>
              <Ionicons name="globe" size={14} color="#3b82f6" />
              <Text style={[styles.toggleLabel, { color: tokens.textSecondary }]}>
                Public
              </Text>
            </View>
            <Switch
              value={testimonial.isPublic}
              onValueChange={onToggleVisibility}
              trackColor={{ false: tokens.border, true: "#3b82f6" }}
              thumbColor="#ffffff"
              disabled={disabled}
            />
          </View>
        </View>
      )}
    </Pressable>
  );
}

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    card: {
      backgroundColor: tokens.background,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: tokens.border,
      // Neomorphic shadow
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    featuredCard: {
      borderColor: "#8b5cf6",
      borderWidth: 2,
    },
    selectedCard: {
      borderColor: tokens.accent,
      borderWidth: 2,
      backgroundColor: tokens.accent + "10",
    },
    disabledCard: {
      opacity: 0.6,
    },
    checkboxContainer: {
      position: "absolute",
      top: 12,
      right: 12,
      zIndex: 1,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: tokens.border,
      backgroundColor: tokens.background,
      alignItems: "center",
      justifyContent: "center",
    },
    checkboxSelected: {
      backgroundColor: tokens.accent,
      borderColor: tokens.accent,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 12,
    },
    avatarContainer: {
      marginRight: 12,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      fontSize: 18,
      fontWeight: "700",
      fontFamily: "Bytesized-Regular",
    },
    clientInfo: {
      flex: 1,
    },
    clientName: {
      fontSize: 15,
      fontWeight: "700",
      fontFamily: "lores-9-wide",
      marginBottom: 2,
    },
    clientCompany: {
      fontSize: 12,
      fontFamily: "lores-9-wide",
      marginBottom: 2,
    },
    date: {
      fontSize: 11,
      fontFamily: "lores-9-wide",
    },
    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      gap: 4,
    },
    statusText: {
      fontSize: 10,
      fontWeight: "700",
      fontFamily: "lores-9-wide",
      textTransform: "uppercase",
    },
    ratingRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    starsContainer: {
      flexDirection: "row",
      gap: 2,
    },
    serviceName: {
      fontSize: 11,
      fontFamily: "lores-9-wide",
      fontStyle: "italic",
    },
    indicatorRow: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 8,
    },
    indicator: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      gap: 4,
    },
    indicatorText: {
      fontSize: 10,
      fontWeight: "600",
      fontFamily: "lores-9-wide",
    },
    title: {
      fontSize: 14,
      fontWeight: "700",
      fontFamily: "lores-9-wide",
      marginBottom: 6,
    },
    content: {
      fontSize: 13,
      lineHeight: 20,
      fontFamily: "lores-9-wide",
    },
    expandToggle: {
      fontSize: 12,
      fontWeight: "600",
      fontFamily: "lores-9-wide",
      marginTop: 4,
    },
    actionRow: {
      flexDirection: "row",
      gap: 12,
      marginTop: 16,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: tokens.border,
    },
    actionButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 10,
      borderRadius: 8,
      gap: 6,
    },
    rejectButton: {
      backgroundColor: "rgba(239, 68, 68, 0.1)",
      borderWidth: 1,
      borderColor: "rgba(239, 68, 68, 0.3)",
    },
    approveButton: {
      backgroundColor: "rgba(16, 185, 129, 0.1)",
      borderWidth: 1,
      borderColor: "rgba(16, 185, 129, 0.3)",
    },
    actionButtonText: {
      fontSize: 12,
      fontWeight: "700",
      fontFamily: "lores-9-wide",
      textTransform: "uppercase",
    },
    toggleRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 16,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: tokens.border,
    },
    toggleItem: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    toggleLabelRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    toggleLabel: {
      fontSize: 11,
      fontFamily: "lores-9-wide",
    },
    toggleDivider: {
      width: 1,
      height: 24,
      backgroundColor: tokens.border,
      marginHorizontal: 12,
    },
  });
