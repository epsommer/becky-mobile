"use client";

import React, { useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import TestimonialsPanel from "../TestimonialsPanel";
import QuickMessagePanel from "../QuickMessagePanel";
import TestimonialRequestModal from "../TestimonialRequestModal";

export default function TestimonialsScreen() {
  const [showModal, setShowModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleAddTestimonial = () => {
    setShowModal(true);
  };

  const handleRequestSent = () => {
    // Refresh testimonials list
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Testimonials</Text>
        <TestimonialsPanel key={refreshKey} onAddTestimonial={handleAddTestimonial} />
        <QuickMessagePanel />
      </ScrollView>

      <TestimonialRequestModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onRequestSent={handleRequestSent}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  heading: {
    color: "#f5f6ff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
});
