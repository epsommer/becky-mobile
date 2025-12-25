/**
 * Date Range Selector Component
 * Allows users to select time periods for analytics
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeTokens } from '../../theme/ThemeContext';
import NeomorphicCard from '../NeomorphicCard';
import { DateRangeType, AnalyticsDateRange } from '../../lib/api/endpoints/analytics';
import { format } from 'date-fns';

interface DateRangeSelectorProps {
  currentRange: AnalyticsDateRange;
  onRangeChange: (type: DateRangeType) => void;
  onCustomRangeSelect?: (startDate: string, endDate: string) => void;
}

const RANGE_OPTIONS: Array<{ type: DateRangeType; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { type: 'this_week', label: 'This Week', icon: 'calendar-outline' },
  { type: 'this_month', label: 'This Month', icon: 'calendar' },
  { type: 'this_year', label: 'This Year', icon: 'calendar-sharp' },
  // { type: 'custom', label: 'Custom Range', icon: 'options-outline' },
];

export default function DateRangeSelector({
  currentRange,
  onRangeChange,
  onCustomRangeSelect,
}: DateRangeSelectorProps) {
  const { tokens, windowTheme } = useTheme();
  const styles = createStyles(tokens);
  const [modalVisible, setModalVisible] = useState(false);

  const getCurrentRangeLabel = (): string => {
    const option = RANGE_OPTIONS.find(o => o.type === currentRange.rangeType);
    if (option) return option.label;

    if (currentRange.rangeType === 'custom' && currentRange.startDate && currentRange.endDate) {
      return `${format(new Date(currentRange.startDate), 'MMM d')} - ${format(new Date(currentRange.endDate), 'MMM d')}`;
    }

    return 'Select Range';
  };

  const handleRangeSelect = (type: DateRangeType) => {
    onRangeChange(type);
    setModalVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        style={styles.selector}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="calendar" size={16} color={tokens.accent} />
        <Text style={styles.selectorText}>{getCurrentRangeLabel()}</Text>
        <Ionicons name="chevron-down" size={16} color={tokens.textSecondary} />
      </TouchableOpacity>

      <Modal
        transparent
        visible={modalVisible}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={[
            styles.modalBackdrop,
            { backgroundColor: windowTheme === 'tactical' ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.4)' },
          ]}
          onPress={() => setModalVisible(false)}
        />
        <View style={styles.modalContainer}>
          <NeomorphicCard style={styles.modalCard} contentStyle={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Date Range</Text>

            <View style={styles.optionsList}>
              {RANGE_OPTIONS.map(option => (
                <TouchableOpacity
                  key={option.type}
                  style={[
                    styles.optionItem,
                    currentRange.rangeType === option.type && styles.optionItemActive,
                  ]}
                  onPress={() => handleRangeSelect(option.type)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={option.icon}
                    size={20}
                    color={
                      currentRange.rangeType === option.type
                        ? tokens.accent
                        : tokens.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.optionText,
                      currentRange.rangeType === option.type && styles.optionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {currentRange.rangeType === option.type && (
                    <Ionicons name="checkmark" size={20} color={tokens.accent} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </NeomorphicCard>
        </View>
      </Modal>
    </>
  );
}

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    selector: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: tokens.surface,
      borderWidth: 1,
      borderColor: tokens.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    selectorText: {
      fontSize: 14,
      fontWeight: '500',
      color: tokens.textPrimary,
      marginLeft: 8,
      marginRight: 4,
    },
    modalBackdrop: {
      ...StyleSheet.absoluteFillObject,
    },
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    modalCard: {
      width: '100%',
      maxWidth: 340,
    },
    modalContent: {
      padding: 20,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: tokens.textPrimary,
      marginBottom: 16,
      textAlign: 'center',
    },
    optionsList: {
      marginBottom: 16,
    },
    optionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 12,
      borderRadius: 12,
      marginBottom: 4,
    },
    optionItemActive: {
      backgroundColor: `${tokens.accent}15`,
    },
    optionText: {
      flex: 1,
      fontSize: 15,
      color: tokens.textPrimary,
      marginLeft: 12,
    },
    optionTextActive: {
      fontWeight: '600',
      color: tokens.accent,
    },
    cancelButton: {
      alignItems: 'center',
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: tokens.border,
      marginTop: 8,
    },
    cancelText: {
      fontSize: 15,
      fontWeight: '500',
      color: tokens.textSecondary,
    },
  });
