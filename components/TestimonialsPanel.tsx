"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View, TextInput, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemeTokens, useTheme } from "../theme/ThemeContext";
import { useTestimonials, useClientTestimonials } from "../hooks/useTestimonials";
import { Picker } from '@react-native-picker/picker';

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

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [ratingFilter, setRatingFilter] = useState<number>(0);
  const [visibilityFilter, setVisibilityFilter] = useState<string>('all');

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Animate list when testimonials load
  useEffect(() => {
    if (!loading && testimonials.length > 0) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [loading, testimonials, fadeAnim]);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const renderStars = (rating: number) => {
    return Array(rating).fill(null).map((_, i) => (
      <Ionicons key={i} name="star" size={14} color="#FFD700" />
    ));
  };

  // Filter testimonials
  const filteredTestimonials = useMemo(() => {
    let filtered = [...testimonials];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.client?.name?.toLowerCase().includes(query) ||
        t.content?.toLowerCase().includes(query) ||
        t.title?.toLowerCase().includes(query) ||
        t.serviceName?.toLowerCase().includes(query) ||
        t.client?.company?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    // Rating filter
    if (ratingFilter > 0) {
      filtered = filtered.filter(t => t.rating === ratingFilter);
    }

    // Visibility filter
    if (visibilityFilter === 'public') {
      filtered = filtered.filter(t => t.isPublic);
    } else if (visibilityFilter === 'private') {
      filtered = filtered.filter(t => !t.isPublic);
    } else if (visibilityFilter === 'featured') {
      filtered = filtered.filter(t => t.isFeatured);
    }

    return filtered;
  }, [testimonials, searchQuery, statusFilter, ratingFilter, visibilityFilter]);

  // Generate dynamic header
  const getDynamicHeader = () => {
    const filters = [];

    if (statusFilter !== 'all') {
      const statusLabels: Record<string, string> = {
        'PENDING': 'Pending',
        'APPROVED': 'Approved',
        'REJECTED': 'Rejected'
      };
      filters.push(statusLabels[statusFilter]);
    }

    if (ratingFilter > 0) {
      filters.push(`${ratingFilter}-Star`);
    }

    if (visibilityFilter !== 'all') {
      const visibilityLabels: Record<string, string> = {
        'public': 'Public',
        'private': 'Private',
        'featured': 'Featured'
      };
      filters.push(visibilityLabels[visibilityFilter]);
    }

    if (searchQuery) {
      filters.push('Searched');
    }

    if (filters.length === 0) {
      return 'All Testimonials';
    }

    return `${filters.join(' ')} Testimonials`;
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
          <Ionicons name="alert-circle" size={24} color={tokens.textSecondary} />
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

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={16} color={tokens.textSecondary} style={{ position: 'absolute', left: 12, top: 12, zIndex: 1 }} />
        <TextInput
          style={[styles.searchInput, { color: tokens.textPrimary, borderColor: tokens.accent }]}
          placeholder="Search testimonials..."
          placeholderTextColor={tokens.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.filterRow}>
          <View style={styles.filterItem}>
            <Text style={[styles.filterLabel, { color: tokens.textSecondary }]}>STATUS</Text>
            <View style={[styles.pickerContainer, { borderColor: tokens.accent }]}>
              <Picker
                selectedValue={statusFilter}
                onValueChange={(itemValue) => setStatusFilter(itemValue)}
                style={[styles.picker, { color: tokens.textPrimary }]}
                dropdownIconColor={tokens.accent}
              >
                <Picker.Item label="All Statuses" value="all" />
                <Picker.Item label="Pending" value="PENDING" />
                <Picker.Item label="Approved" value="APPROVED" />
                <Picker.Item label="Rejected" value="REJECTED" />
              </Picker>
            </View>
          </View>

          <View style={styles.filterItem}>
            <Text style={[styles.filterLabel, { color: tokens.textSecondary }]}>RATING</Text>
            <View style={[styles.pickerContainer, { borderColor: tokens.accent }]}>
              <Picker
                selectedValue={ratingFilter}
                onValueChange={(itemValue) => setRatingFilter(itemValue)}
                style={[styles.picker, { color: tokens.textPrimary }]}
                dropdownIconColor={tokens.accent}
              >
                <Picker.Item label="All Ratings" value={0} />
                <Picker.Item label="5 Stars" value={5} />
                <Picker.Item label="4 Stars" value={4} />
                <Picker.Item label="3 Stars" value={3} />
                <Picker.Item label="2 Stars" value={2} />
                <Picker.Item label="1 Star" value={1} />
              </Picker>
            </View>
          </View>
        </View>

        <View style={styles.filterRow}>
          <View style={styles.filterItem}>
            <Text style={[styles.filterLabel, { color: tokens.textSecondary }]}>VISIBILITY</Text>
            <View style={[styles.pickerContainer, { borderColor: tokens.accent }]}>
              <Picker
                selectedValue={visibilityFilter}
                onValueChange={(itemValue) => setVisibilityFilter(itemValue)}
                style={[styles.picker, { color: tokens.textPrimary }]}
                dropdownIconColor={tokens.accent}
              >
                <Picker.Item label="All" value="all" />
                <Picker.Item label="Public Only" value="public" />
                <Picker.Item label="Private Only" value="private" />
                <Picker.Item label="Featured Only" value="featured" />
              </Picker>
            </View>
          </View>

          <View style={styles.filterItem}>
            <TouchableOpacity
              style={[styles.clearButton, { backgroundColor: tokens.accent }]}
              onPress={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setRatingFilter(0);
                setVisibilityFilter('all');
              }}
            >
              <Text style={styles.clearButtonText}>CLEAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Dynamic Header */}
      <View style={styles.dynamicHeaderRow}>
        <Text style={[styles.dynamicHeader, { color: tokens.textPrimary }]}>
          {getDynamicHeader()}
        </Text>
        <Text style={[styles.resultCount, { color: tokens.textSecondary }]}>
          {filteredTestimonials.length} {filteredTestimonials.length === 1 ? 'result' : 'results'}
        </Text>
      </View>

      {filteredTestimonials.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={32} color={tokens.textSecondary} />
          <Text style={[styles.emptyText, { color: tokens.textSecondary }]}>
            {searchQuery || statusFilter !== 'all' || ratingFilter > 0 || visibilityFilter !== 'all'
              ? 'No testimonials match your filters'
              : 'No testimonials yet'}
          </Text>
        </View>
      ) : (
        <Animated.View style={{ opacity: fadeAnim }}>
        {filteredTestimonials.map((testimonial) => (
          <View key={testimonial.id} style={styles.testimonialCard}>
            <View style={styles.ratingRow}>
              <View style={styles.starsContainer}>{renderStars(testimonial.rating)}</View>
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
        ))}
        </Animated.View>
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
    searchContainer: {
      position: 'relative',
      marginBottom: 12,
    },
    searchIcon: {
      position: 'absolute',
      left: 12,
      top: 12,
      zIndex: 1,
    },
    searchInput: {
      fontFamily: 'lores-9-wide',
      fontSize: 13,
      paddingLeft: 36,
      paddingRight: 12,
      paddingVertical: 10,
      borderWidth: 1,
      borderRadius: 4,
      backgroundColor: tokens.background,
    },
    filtersContainer: {
      marginBottom: 16,
    },
    filterRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 8,
    },
    filterItem: {
      flex: 1,
    },
    filterLabel: {
      fontFamily: 'lores-9-wide',
      fontSize: 10,
      fontWeight: '700',
      marginBottom: 4,
    },
    pickerContainer: {
      borderWidth: 1,
      borderRadius: 4,
      backgroundColor: tokens.background,
    },
    picker: {
      fontFamily: 'lores-9-wide',
      fontSize: 12,
      height: 40,
    },
    clearButton: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 4,
      height: 40,
      marginTop: 14,
    },
    clearButtonText: {
      fontFamily: 'lores-9-wide',
      fontSize: 11,
      fontWeight: '700',
      color: '#000',
    },
    dynamicHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: tokens.accent + '30',
    },
    dynamicHeader: {
      fontSize: 14,
      fontFamily: 'Bytesized-Regular',
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    resultCount: {
      fontSize: 11,
      fontFamily: 'lores-9-wide',
    },
    testimonialCard: {
      marginBottom: 12,
    },
    ratingRow: {
      marginBottom: 4,
    },
    starsContainer: {
      flexDirection: 'row',
      gap: 2,
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
