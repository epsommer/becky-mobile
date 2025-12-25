/**
 * TestimonialsScreen - Testimonial management with approval workflow
 *
 * Features:
 * - Display testimonials with star ratings
 * - Approve/reject pending testimonials
 * - Featured and visibility toggles
 * - Enhanced filtering (status, rating, visibility, featured)
 * - Sorting by date, rating, client name
 * - Batch operations (bulk approve/reject/delete)
 * - Testimonial detail modal with edit capabilities
 * - Delete with confirmation
 */
"use client";

import React, { useState, useMemo } from "react";
import { ScrollView, StyleSheet, View, Text, RefreshControl } from "react-native";
import { ThemeTokens, useTheme } from "../../theme/ThemeContext";
import TestimonialsPanel from "../TestimonialsPanel";
import QuickMessagePanel from "../QuickMessagePanel";
import TestimonialRequestModal from "../TestimonialRequestModal";

export default function TestimonialsScreen() {
  const { tokens } = useTheme();
  const styles = useMemo(() => createStyles(tokens), [tokens]);

  const [showModal, setShowModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const handleAddTestimonial = () => {
    setShowModal(true);
  };

  const handleRequestSent = () => {
    // Refresh testimonials list
    setRefreshKey((prev) => prev + 1);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    // Trigger refresh by changing the key
    setRefreshKey((prev) => prev + 1);
    // Small delay to show refresh indicator
    setTimeout(() => setRefreshing(false), 500);
  };

  return (
    <>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={tokens.accent}
            colors={[tokens.accent]}
          />
        }
      >
        <View style={styles.headerContainer}>
          <Text style={[styles.heading, { color: tokens.textPrimary }]}>
            Testimonials
          </Text>
          <Text style={[styles.subheading, { color: tokens.textSecondary }]}>
            Manage client feedback and reviews
          </Text>
        </View>

        <TestimonialsPanel key={refreshKey} onAddTestimonial={handleAddTestimonial} />

        <View style={styles.quickMessageContainer}>
          <QuickMessagePanel />
        </View>
      </ScrollView>

      <TestimonialRequestModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onRequestSent={handleRequestSent}
      />
    </>
  );
}

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    scrollView: {
      flex: 1,
      backgroundColor: tokens.background,
    },
    container: {
      padding: 16,
      paddingBottom: 32,
    },
    headerContainer: {
      marginBottom: 16,
    },
    heading: {
      fontSize: 24,
      fontWeight: "700",
      fontFamily: "Bytesized-Regular",
      marginBottom: 4,
    },
    subheading: {
      fontSize: 13,
      fontFamily: "lores-9-wide",
    },
    quickMessageContainer: {
      marginTop: 24,
    },
  });
