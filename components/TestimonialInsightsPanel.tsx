"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemeTokens, useTheme } from "../theme/ThemeContext";
import { testimonialsApi, Testimonial } from "../lib/api/endpoints/testimonials";

interface TestimonialInsightsPanelProps {
  clientId: string;
  clientName: string;
  onRequestTestimonial: () => void;
  onViewTestimonials?: () => void;
}

type TestimonialStatus = 'NOT_REQUESTED' | 'PENDING' | 'APPROVED' | 'REJECTED';

export default function TestimonialInsightsPanel({
  clientId,
  clientName,
  onRequestTestimonial,
  onViewTestimonials,
}: TestimonialInsightsPanelProps) {
  const { tokens } = useTheme();
  const styles = useMemo(() => createStyles(tokens), [tokens]);

  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTestimonials = useCallback(async () => {
    if (!clientId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await testimonialsApi.getTestimonialsByClientId(clientId);
      if (response.success && response.data) {
        setTestimonials(response.data);
      } else {
        setTestimonials([]);
      }
    } catch (err) {
      console.error('[TestimonialInsightsPanel] Error fetching testimonials:', err);
      setError('Failed to load testimonials');
      setTestimonials([]);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchTestimonials();
  }, [fetchTestimonials]);

  // Calculate overall status
  const overallStatus: TestimonialStatus = useMemo(() => {
    if (testimonials.length === 0) return 'NOT_REQUESTED';

    const hasApproved = testimonials.some(t => t.status === 'APPROVED');
    if (hasApproved) return 'APPROVED';

    const hasPending = testimonials.some(t => t.status === 'PENDING');
    if (hasPending) return 'PENDING';

    return 'REJECTED';
  }, [testimonials]);

  // Get status display info
  const getStatusInfo = (status: TestimonialStatus) => {
    switch (status) {
      case 'NOT_REQUESTED':
        return {
          label: 'Not Requested',
          description: 'No testimonial has been requested from this client yet.',
          icon: 'star-outline' as const,
          color: tokens.textSecondary,
          bgColor: tokens.background,
        };
      case 'PENDING':
        return {
          label: 'Request Sent',
          description: 'Waiting for the client to submit their testimonial.',
          icon: 'time-outline' as const,
          color: '#eab308',
          bgColor: '#fef9c3',
        };
      case 'APPROVED':
        return {
          label: 'Testimonial Received',
          description: 'This client has submitted an approved testimonial.',
          icon: 'checkmark-circle' as const,
          color: '#22c55e',
          bgColor: '#dcfce7',
        };
      case 'REJECTED':
        return {
          label: 'Not Approved',
          description: 'The testimonial was submitted but not approved.',
          icon: 'close-circle' as const,
          color: '#ef4444',
          bgColor: '#fee2e2',
        };
    }
  };

  const statusInfo = getStatusInfo(overallStatus);

  // Calculate testimonial stats
  const stats = useMemo(() => {
    const approved = testimonials.filter(t => t.status === 'APPROVED').length;
    const pending = testimonials.filter(t => t.status === 'PENDING').length;
    const rejected = testimonials.filter(t => t.status === 'REJECTED').length;
    const avgRating = testimonials.filter(t => t.rating).reduce((sum, t) => sum + (t.rating || 0), 0) /
      (testimonials.filter(t => t.rating).length || 1);

    return { approved, pending, rejected, avgRating, total: testimonials.length };
  }, [testimonials]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={tokens.accent} />
        <Text style={styles.loadingText}>Loading testimonials...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Testimonial Status Card */}
      <View style={[styles.statusCard, { backgroundColor: statusInfo.bgColor }]}>
        <View style={styles.statusHeader}>
          <Ionicons name={statusInfo.icon} size={32} color={statusInfo.color} />
          <View style={styles.statusInfo}>
            <Text style={[styles.statusLabel, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
            <Text style={styles.statusDescription}>{statusInfo.description}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {overallStatus === 'NOT_REQUESTED' && (
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: tokens.accent }]}
              onPress={onRequestTestimonial}
            >
              <Ionicons name="send" size={16} color={tokens.textPrimary} />
              <Text style={[styles.primaryButtonText, { color: tokens.textPrimary }]}>
                Request Testimonial
              </Text>
            </TouchableOpacity>
          )}

          {overallStatus === 'PENDING' && (
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: tokens.border }]}
              onPress={onRequestTestimonial}
            >
              <Ionicons name="refresh" size={16} color={tokens.accent} />
              <Text style={[styles.secondaryButtonText, { color: tokens.accent }]}>
                Send Reminder
              </Text>
            </TouchableOpacity>
          )}

          {testimonials.length > 0 && onViewTestimonials && (
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: tokens.border }]}
              onPress={onViewTestimonials}
            >
              <Ionicons name="eye" size={16} color={tokens.accent} />
              <Text style={[styles.secondaryButtonText, { color: tokens.accent }]}>
                View Testimonials
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Stats Section */}
      {testimonials.length > 0 && (
        <View style={styles.statsCard}>
          <View style={styles.statsHeader}>
            <Ionicons name="stats-chart" size={18} color={tokens.accent} />
            <Text style={styles.statsTitle}>Testimonial Stats</Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#22c55e' }]}>{stats.approved}</Text>
              <Text style={styles.statLabel}>Approved</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#eab308' }]}>{stats.pending}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statItem}>
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={14} color="#eab308" />
                <Text style={styles.statValue}>
                  {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : '-'}
                </Text>
              </View>
              <Text style={styles.statLabel}>Avg Rating</Text>
            </View>
          </View>
        </View>
      )}

      {/* Recent Testimonials */}
      {testimonials.length > 0 && (
        <View style={styles.recentCard}>
          <View style={styles.recentHeader}>
            <Ionicons name="chatbubble-ellipses" size={18} color={tokens.accent} />
            <Text style={styles.recentTitle}>Recent Testimonials</Text>
          </View>

          {testimonials.slice(0, 3).map((testimonial) => (
            <View key={testimonial.id} style={styles.testimonialItem}>
              <View style={styles.testimonialHeader}>
                <View style={styles.ratingStars}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Ionicons
                      key={star}
                      name={star <= (testimonial.rating || 0) ? 'star' : 'star-outline'}
                      size={12}
                      color="#eab308"
                    />
                  ))}
                </View>
                <View style={[
                  styles.testimonialStatusBadge,
                  {
                    backgroundColor: testimonial.status === 'APPROVED' ? '#dcfce7' :
                      testimonial.status === 'PENDING' ? '#fef9c3' : '#fee2e2',
                  }
                ]}>
                  <Text style={[
                    styles.testimonialStatusText,
                    {
                      color: testimonial.status === 'APPROVED' ? '#22c55e' :
                        testimonial.status === 'PENDING' ? '#eab308' : '#ef4444',
                    }
                  ]}>
                    {testimonial.status}
                  </Text>
                </View>
              </View>

              <Text style={styles.testimonialContent} numberOfLines={3}>
                "{testimonial.content}"
              </Text>

              <View style={styles.testimonialMeta}>
                {testimonial.serviceName && (
                  <Text style={styles.testimonialService}>
                    <Ionicons name="briefcase-outline" size={10} color={tokens.textSecondary} />
                    {' '}{testimonial.serviceName}
                  </Text>
                )}
                {testimonial.submittedAt && (
                  <Text style={styles.testimonialDate}>
                    {new Date(testimonial.submittedAt).toLocaleDateString()}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Empty State for No Testimonials */}
      {testimonials.length === 0 && !loading && (
        <View style={styles.emptyCard}>
          <Ionicons name="star-outline" size={48} color={tokens.textSecondary} />
          <Text style={styles.emptyTitle}>No Testimonials Yet</Text>
          <Text style={styles.emptyDescription}>
            Request a testimonial from {clientName} to showcase their positive experience.
          </Text>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: tokens.accent, marginTop: 16 }]}
            onPress={onRequestTestimonial}
          >
            <Ionicons name="send" size={16} color={tokens.textPrimary} />
            <Text style={[styles.primaryButtonText, { color: tokens.textPrimary }]}>
              Request Testimonial
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
      gap: 12,
    },
    loadingText: {
      color: tokens.textSecondary,
      fontSize: 12,
    },
    statusCard: {
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    statusHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      marginBottom: 16,
    },
    statusInfo: {
      flex: 1,
    },
    statusLabel: {
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 4,
    },
    statusDescription: {
      color: tokens.textSecondary,
      fontSize: 12,
      lineHeight: 16,
    },
    actionButtons: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    primaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
    },
    primaryButtonText: {
      fontSize: 12,
      fontWeight: '700',
    },
    secondaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
    },
    secondaryButtonText: {
      fontSize: 11,
      fontWeight: '600',
    },
    statsCard: {
      backgroundColor: tokens.background,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    statsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 16,
    },
    statsTitle: {
      color: tokens.textPrimary,
      fontSize: 14,
      fontWeight: '600',
    },
    statsGrid: {
      flexDirection: 'row',
      justifyContent: 'space-around',
    },
    statItem: {
      alignItems: 'center',
    },
    statValue: {
      color: tokens.textPrimary,
      fontSize: 20,
      fontWeight: '700',
    },
    statLabel: {
      color: tokens.textSecondary,
      fontSize: 10,
      marginTop: 4,
    },
    ratingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    recentCard: {
      backgroundColor: tokens.background,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    recentHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    recentTitle: {
      color: tokens.textPrimary,
      fontSize: 14,
      fontWeight: '600',
    },
    testimonialItem: {
      backgroundColor: tokens.surface,
      borderRadius: 8,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    testimonialHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    ratingStars: {
      flexDirection: 'row',
      gap: 2,
    },
    testimonialStatusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
    },
    testimonialStatusText: {
      fontSize: 9,
      fontWeight: '700',
    },
    testimonialContent: {
      color: tokens.textSecondary,
      fontSize: 12,
      lineHeight: 16,
      fontStyle: 'italic',
      marginBottom: 8,
    },
    testimonialMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    testimonialService: {
      color: tokens.textSecondary,
      fontSize: 10,
    },
    testimonialDate: {
      color: tokens.textSecondary,
      fontSize: 10,
    },
    emptyCard: {
      backgroundColor: tokens.background,
      borderRadius: 12,
      padding: 32,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: tokens.border,
    },
    emptyTitle: {
      color: tokens.textPrimary,
      fontSize: 16,
      fontWeight: '700',
      marginTop: 16,
      marginBottom: 8,
    },
    emptyDescription: {
      color: tokens.textSecondary,
      fontSize: 12,
      textAlign: 'center',
      lineHeight: 18,
    },
  });
