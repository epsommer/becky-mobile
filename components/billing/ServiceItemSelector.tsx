"use client";

import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { ServiceLine, ServiceItem } from "../../hooks/useServiceLines";

interface ServiceItemSelectorProps {
  serviceLine: ServiceLine;
  onSelectServiceItem: (serviceItem: ServiceItem) => void;
  onBack: () => void;
}

export default function ServiceItemSelector({
  serviceLine,
  onSelectServiceItem,
  onBack,
}: ServiceItemSelectorProps) {
  const { tokens } = useTheme();

  const formatPrice = (price?: number) => {
    if (price === undefined) return "Custom pricing";
    return `$${price.toFixed(2)}`;
  };

  const formatBillingMode = (mode?: 'quantity' | 'hours') => {
    if (!mode) return "";
    return mode === 'hours' ? '/hr' : '/ea';
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { borderBottomColor: tokens.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 24, color: tokens.accent }}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: tokens.textPrimary }]}>
            {serviceLine.category}
          </Text>
          <Text style={[styles.subtitle, { color: tokens.textSecondary }]}>
            Select a specific service
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {serviceLine.items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={{ fontSize: 48, color: tokens.textSecondary }}>📥</Text>
            <Text style={[styles.emptyText, { color: tokens.textSecondary }]}>
              No services available in this category
            </Text>
          </View>
        ) : (
          serviceLine.items.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.serviceItemCard,
                { backgroundColor: tokens.surface, borderColor: tokens.border },
              ]}
              onPress={() => onSelectServiceItem(item)}
              activeOpacity={0.7}
            >
              <View style={styles.serviceItemContent}>
                <View style={styles.serviceItemHeader}>
                  <Text style={[styles.serviceItemTitle, { color: tokens.textPrimary }]}>
                    {item.title}
                  </Text>
                  {item.defaultPrice !== undefined && (
                    <View style={styles.priceContainer}>
                      <Text style={[styles.price, { color: tokens.accent }]}>
                        {formatPrice(item.defaultPrice)}
                      </Text>
                      {item.defaultBillingMode && (
                        <Text style={[styles.billingMode, { color: tokens.textSecondary }]}>
                          {formatBillingMode(item.defaultBillingMode)}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
                {item.description && (
                  <Text
                    style={[styles.serviceItemDescription, { color: tokens.textSecondary }]}
                    numberOfLines={2}
                  >
                    {item.description}
                  </Text>
                )}
              </View>
              <Text style={{ fontSize: 24, color: tokens.accent }}>➕</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: tokens.border }]}>
        <TouchableOpacity
          style={[styles.cancelButton, { borderColor: tokens.border }]}
          onPress={onBack}
        >
          <Text style={[styles.cancelButtonText, { color: tokens.textSecondary }]}>
            Back to Categories
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontFamily: "Bytesized-Regular",
    fontWeight: "700",
    marginBottom: 2,
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
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 14,
    fontFamily: "lores-9-wide",
    textAlign: "center",
  },
  serviceItemCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  serviceItemContent: {
    flex: 1,
    marginRight: 12,
  },
  serviceItemHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  serviceItemTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: "lores-9-wide",
    fontWeight: "700",
    marginRight: 8,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  price: {
    fontSize: 16,
    fontFamily: "Bytesized-Regular",
    fontWeight: "700",
  },
  billingMode: {
    fontSize: 12,
    fontFamily: "lores-9-wide",
  },
  serviceItemDescription: {
    fontSize: 13,
    fontFamily: "lores-9-wide",
    lineHeight: 18,
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
