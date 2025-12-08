"use client";

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/ThemeContext";

interface EmailStatusBadgeProps {
  status: 'pending' | 'sent' | 'delivered' | 'failed' | null;
}

export default function EmailStatusBadge({ status }: EmailStatusBadgeProps) {
  const { tokens } = useTheme();

  if (!status) return null;

  const getStatusConfig = () => {
    switch (status) {
      case 'delivered':
        return {
          label: 'Delivered',
          iconName: 'checkmark' as const,
          color: '#4CAF50',
          backgroundColor: '#E8F5E9',
        };
      case 'sent':
        return {
          label: 'Sent',
          iconName: 'send' as const,
          color: '#2196F3',
          backgroundColor: '#E3F2FD',
        };
      case 'pending':
        return {
          label: 'Pending',
          iconName: 'time-outline' as const,
          color: '#FF9800',
          backgroundColor: '#FFF3E0',
        };
      case 'failed':
        return {
          label: 'Failed',
          iconName: 'alert-circle' as const,
          color: '#F44336',
          backgroundColor: '#FFEBEE',
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();
  if (!config) return null;

  return (
    <View style={[styles.badge, { backgroundColor: config.backgroundColor, borderColor: config.color }]}>
      <Ionicons name={config.iconName} size={14} color={config.color} />
      <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  label: {
    fontSize: 11,
    fontFamily: "lores-9-wide",
    fontWeight: "700",
    textTransform: "uppercase",
  },
});
