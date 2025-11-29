"use client";

import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const testimonials = [
  {
    text: "You went above and beyond organizing our invoices and reminders. Becky keeps us on track.",
    author: "Woodgreen Landscaping",
    date: "Nov 25",
  },
  {
    text: "Love the quick testimonial follow-up flow—our partners can reply without fuss.",
    author: "Marina Studio",
    date: "Nov 20",
  },
  {
    text: "The CRM timeline and notifications keep everything in one place—no more chasing threads.",
    author: "Sammy Creative",
    date: "Nov 15",
  },
];

export default function TestimonialsPanel() {
  return (
    <View style={styles.panel}>
      <View style={styles.headingRow}>
        <Text style={styles.heading}>Testimonials</Text>
        <TouchableOpacity>
          <Text style={styles.cta}>Add testimonial</Text>
        </TouchableOpacity>
      </View>
      {testimonials.map((entry) => (
        <View key={entry.author} style={styles.testimonialCard}>
          <Text style={styles.text}>{entry.text}</Text>
          <Text style={styles.meta}>{entry.author} · {entry.date}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginTop: 12,
    borderRadius: 18,
    backgroundColor: "#0f1322",
    padding: 16,
    borderWidth: 1,
    borderColor: "#1b2134",
  },
  headingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  heading: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f5f6ff",
  },
  cta: {
    color: "#6fb1ff",
    textTransform: "uppercase",
    fontSize: 12,
    fontWeight: "600",
  },
  testimonialCard: {
    marginBottom: 12,
  },
  text: {
    color: "#cbd3f4",
    fontSize: 13,
  },
  meta: {
    color: "#6f85cc",
    fontSize: 11,
    marginTop: 4,
    textTransform: "uppercase",
  },
});
