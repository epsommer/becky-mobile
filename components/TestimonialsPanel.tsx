"use client";

import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemeTokens, useTheme } from "../theme/ThemeContext";
import { useTestimonials, useClientTestimonials } from "../hooks/useTestimonials";

interface TestimonialsPanelProps {
  clientId?: string;
  onAddTestimonial?: () => void;
}

export default function TestimonialsPanel({ clientId, onAddTestimonial }: TestimonialsPanelProps) {
  const { tokens } = useTheme();
  const styles = React.useMemo(() => createStyles(tokens), [tokens]);

  // Use appropriate hook based on whether clientId is provided
  const { testimonials, loading, error } = clientId
    ? useClientTestimonials(clientId)
    : useTestimonials();

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const renderStars = (rating: number) => {
    return '⭐'.repeat(rating);
  };

  if (loading) {
    return (
      <View style={styles.panel}>
        <View style={styles.headingRow}>
          <Text style={styles.heading}>Testimonials</Text>
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="small" color={tokens.accent} />
          <Text style={[styles.loadingText, { color: tokens.textSecondary }]}>
            Loading testimonials...
          </Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.panel}>
        <View style={styles.headingRow}>
          <Text style={styles.heading}>Testimonials</Text>
        </View>
        <View style={styles.centerContainer}>
          <Feather name="alert-circle" size={24} color={tokens.textSecondary} />
          <Text style={[styles.errorText, { color: tokens.textSecondary }]}>
            {error}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      <View style={styles.headingRow}>
        <Text style={styles.heading}>Testimonials</Text>
        {onAddTestimonial && (
          <TouchableOpacity onPress={onAddTestimonial}>
            <Text style={styles.cta}>Add testimonial</Text>
          </TouchableOpacity>
        )}
      </View>
      {testimonials.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Feather name="message-circle" size={32} color={tokens.textSecondary} />
          <Text style={[styles.emptyText, { color: tokens.textSecondary }]}>
            No testimonials yet
          </Text>
        </View>
      ) : (
        testimonials.map((testimonial) => (
          <View key={testimonial.id} style={styles.testimonialCard}>
            <View style={styles.ratingRow}>
              <Text style={styles.stars}>{renderStars(testimonial.rating)}</Text>
            </View>
            {testimonial.title && (
              <Text style={[styles.title, { color: tokens.textPrimary }]}>
                {testimonial.title}
              </Text>
            )}
            <Text style={styles.text}>{testimonial.content}</Text>
            <Text style={styles.meta}>
              {testimonial.client?.name || 'Anonymous'} · {formatDate(testimonial.createdAt)}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    panel: {
      width: '100%',
      alignSelf: 'stretch',
    },
    headingRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10,
    },
    heading: {
      fontSize: 16,
      fontFamily: 'Bytesized-Regular',
      fontWeight: "700",
      color: tokens.textPrimary,
    },
    cta: {
      color: tokens.accent,
      fontFamily: 'lores-9-wide',
      textTransform: "uppercase",
      fontSize: 12,
      fontWeight: "600",
    },
    testimonialCard: {
      marginBottom: 12,
    },
    ratingRow: {
      marginBottom: 4,
    },
    stars: {
      fontSize: 14,
    },
    title: {
      fontSize: 14,
      fontFamily: 'lores-9-wide',
      fontWeight: '700',
      marginBottom: 4,
    },
    text: {
      color: tokens.textSecondary,
      fontFamily: 'lores-9-wide',
      fontSize: 13,
    },
    meta: {
      color: tokens.highlight,
      fontFamily: 'lores-9-wide',
      fontSize: 11,
      marginTop: 4,
      textTransform: "uppercase",
    },
    centerContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 24,
      gap: 8,
    },
    loadingText: {
      fontSize: 13,
      fontFamily: 'lores-9-wide',
    },
    errorText: {
      fontSize: 13,
      fontFamily: 'lores-9-wide',
      textAlign: 'center',
      marginTop: 8,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 32,
      gap: 12,
    },
    emptyText: {
      fontSize: 14,
      fontFamily: 'lores-9-wide',
    },
  });
