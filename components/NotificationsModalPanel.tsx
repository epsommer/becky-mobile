"use client";

import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

const notifications = [
  {
    title: "Client feedback received",
    detail: "Marina Studio submitted a testimonial reply.",
    time: "2m ago",
  },
  {
    title: "Receipt delivered",
    detail: "Woodgreen Landscaping confirmed the invoice.",
    time: "1h ago",
  },
  {
    title: "Testimonial request fail",
    detail: "Sammy Creative's email bounced. Retry?",
    time: "Yesterday",
  },
];

export default function NotificationsModalPanel() {
  return (
    <ScrollView contentContainerStyle={styles.panel}>
      <Text style={styles.heading}>Notifications</Text>
      {notifications.map((note) => (
        <View key={note.title} style={styles.notification}>
          <Text style={styles.title}>{note.title}</Text>
          <Text style={styles.detail}>{note.detail}</Text>
          <Text style={styles.time}>{note.time}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: "#0c1020",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#1d2435",
    padding: 20,
    minHeight: 200,
  },
  heading: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f5f6ff",
    marginBottom: 12,
  },
  notification: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#101426",
    marginBottom: 8,
  },
  title: {
    color: "#cbd3f4",
    fontSize: 14,
    fontWeight: "600",
  },
  detail: {
    color: "#9cb3ff",
    fontSize: 12,
    marginTop: 4,
  },
  time: {
    color: "#8fd7ff",
    fontSize: 11,
    marginTop: 6,
    textTransform: "uppercase",
  },
});
