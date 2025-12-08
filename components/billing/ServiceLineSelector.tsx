"use client";

import React from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/ThemeContext";
import { ServiceLine, useServiceLines } from "../../hooks/useServiceLines";

interface ServiceLineSelectorProps {
  onSelectServiceLine: (serviceLine: ServiceLine) => void;
  onCancel: () => void;
}

export default function ServiceLineSelector({
  onSelectServiceLine,
  onCancel,
}: ServiceLineSelectorProps) {
  const { tokens } = useTheme();
  const { serviceLines, loading, error } = useServiceLines();

  const getServiceLineIcon = (category: string): string => {
    // Map service categories to Feather icons
    const iconMap: { [key: string]: string } = {
      'Lawn Mowing': 'scissors',
      'Snow Removal': 'cloud-snow',
      'Landscaping': 'package',
      'Gardening': 'sun',
      'Pressure Washing': 'droplet',
      'Gutter Cleaning': 'home',
      'Tree Services': 'award',
      'Consultation': 'message-circle',
      'Other Services': 'more-horizontal',
    };
    return iconMap[category] || 'briefcase';
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={tokens.accent} />
        <Text style={[styles.loadingText, { color: tokens.textSecondary }]}>
          Loading services...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={48} color={tokens.textSecondary} />
        <Text style={[styles.errorText, { color: tokens.textSecondary }]}>
          {error}
        </Text>
        <TouchableOpacity
          style={[styles.cancelButton, { borderColor: tokens.border }]}
          onPress={onCancel}
        >
          <Text style={[styles.cancelButtonText, { color: tokens.textSecondary }]}>
            Cancel
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { borderBottomColor: tokens.border }]}>
        <Text style={[styles.title, { color: tokens.textPrimary }]}>
          Select Service Category
        </Text>
        <Text style={[styles.subtitle, { color: tokens.textSecondary }]}>
          Choose a service type to add to the receipt
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {serviceLines.map((serviceLine) => (
          <TouchableOpacity
            key={serviceLine.id}
            style={[
              styles.serviceCard,
              { backgroundColor: tokens.surface, borderColor: tokens.border },
            ]}
            onPress={() => onSelectServiceLine(serviceLine)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: tokens.background },
              ]}
            >
              <Ionicons name="clipboard-outline" size={24} color={tokens.accent} />
            </View>
            <View style={styles.serviceInfo}>
              <Text style={[styles.serviceCategory, { color: tokens.textPrimary }]}>
                {serviceLine.category}
              </Text>
              <Text style={[styles.serviceCount, { color: tokens.textSecondary }]}>
                {serviceLine.items.length} service{serviceLine.items.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={tokens.textSecondary} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: tokens.border }]}>
        <TouchableOpacity
          style={[styles.cancelButton, { borderColor: tokens.border }]}
          onPress={onCancel}
        >
          <Text style={[styles.cancelButtonText, { color: tokens.textSecondary }]}>
            Cancel
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    fontFamily: "lores-9-wide",
  },
  errorText: {
    marginTop: 16,
    fontSize: 14,
    fontFamily: "lores-9-wide",
    textAlign: "center",
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontFamily: "Bytesized-Regular",
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "lores-9-wide",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  serviceCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceCategory: {
    fontSize: 16,
    fontFamily: "lores-9-wide",
    fontWeight: "700",
    marginBottom: 4,
  },
  serviceCount: {
    fontSize: 12,
    fontFamily: "lores-9-wide",
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 14,
    fontFamily: "lores-9-wide",
    fontWeight: "700",
  },
});
