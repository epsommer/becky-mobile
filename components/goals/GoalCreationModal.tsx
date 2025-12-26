/**
 * GoalCreationModal Component
 *
 * Modal for creating and editing goals with full form.
 *
 * @module components/goals/GoalCreationModal
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ThemeTokens, useTheme } from '../../theme/ThemeContext';
import {
  Goal,
  CreateGoalRequest,
  UpdateGoalRequest,
  GoalCategory,
  GoalTimeframe,
  Priority,
  GOAL_CATEGORIES,
  PRIORITY_COLORS,
} from '../../services/goals';

export interface GoalCreationModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (request: CreateGoalRequest | UpdateGoalRequest) => Promise<void>;
  editingGoal?: Goal;
  initialCategory?: GoalCategory;
}

const TIMEFRAME_OPTIONS: { value: GoalTimeframe; label: string; days: number }[] = [
  { value: 'daily', label: 'Daily', days: 1 },
  { value: 'weekly', label: 'Weekly', days: 7 },
  { value: 'monthly', label: 'Monthly', days: 30 },
  { value: 'quarterly', label: 'Quarterly', days: 90 },
  { value: 'yearly', label: 'Yearly', days: 365 },
  { value: 'custom', label: 'Custom', days: 0 },
];

const PRIORITY_OPTIONS: { value: Priority; label: string; icon: string }[] = [
  { value: 'low', label: 'Low', icon: 'arrow-down-circle' },
  { value: 'medium', label: 'Medium', icon: 'remove-circle' },
  { value: 'high', label: 'High', icon: 'arrow-up-circle' },
  { value: 'urgent', label: 'Urgent', icon: 'flame' },
];

const GoalCreationModal: React.FC<GoalCreationModalProps> = ({
  visible,
  onClose,
  onSave,
  editingGoal,
  initialCategory,
}) => {
  const { tokens } = useTheme();
  const styles = useMemo(() => createStyles(tokens), [tokens]);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<GoalCategory>(initialCategory || 'business');
  const [timeframe, setTimeframe] = useState<GoalTimeframe>('monthly');
  const [priority, setPriority] = useState<Priority>('medium');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
  const [targetValue, setTargetValue] = useState('100');
  const [progressUnit, setProgressUnit] = useState('percentage');
  const [tags, setTags] = useState('');
  const [notes, setNotes] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [color, setColor] = useState('');

  // Date picker state
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Saving state
  const [saving, setSaving] = useState(false);

  // Reset form when modal opens/closes or editing goal changes
  useEffect(() => {
    if (visible) {
      if (editingGoal) {
        setTitle(editingGoal.title);
        setDescription(editingGoal.description || '');
        setCategory(editingGoal.category);
        setTimeframe(editingGoal.timeframe);
        setPriority(editingGoal.priority);
        setStartDate(new Date(editingGoal.startDate));
        setEndDate(new Date(editingGoal.endDate));
        setTargetValue(String(editingGoal.targetValue));
        setProgressUnit(editingGoal.progressUnit || 'percentage');
        setTags(editingGoal.tags.join(', '));
        setNotes(editingGoal.notes || '');
        setEstimatedHours(editingGoal.estimatedHours ? String(editingGoal.estimatedHours) : '');
        setColor(editingGoal.color || '');
      } else {
        // Reset to defaults
        setTitle('');
        setDescription('');
        setCategory(initialCategory || 'business');
        setTimeframe('monthly');
        setPriority('medium');
        setStartDate(new Date());
        setEndDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
        setTargetValue('100');
        setProgressUnit('percentage');
        setTags('');
        setNotes('');
        setEstimatedHours('');
        setColor('');
      }
    }
  }, [visible, editingGoal, initialCategory]);

  // Update end date when timeframe changes
  useEffect(() => {
    if (timeframe !== 'custom') {
      const option = TIMEFRAME_OPTIONS.find((t) => t.value === timeframe);
      if (option) {
        setEndDate(new Date(startDate.getTime() + option.days * 24 * 60 * 60 * 1000));
      }
    }
  }, [timeframe, startDate]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please enter a goal title.');
      return;
    }

    if (endDate <= startDate) {
      Alert.alert('Invalid Dates', 'End date must be after start date.');
      return;
    }

    setSaving(true);

    try {
      const request: CreateGoalRequest = {
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        timeframe,
        priority,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        targetValue: parseInt(targetValue, 10) || 100,
        progressUnit: progressUnit || 'percentage',
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter((t) => t.length > 0),
        color: color || undefined,
        estimatedHours: estimatedHours ? parseInt(estimatedHours, 10) : undefined,
      };

      await onSave(request);
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to save goal. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={tokens.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {editingGoal ? 'Edit Goal' : 'Create Goal'}
          </Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Title */}
          <View style={styles.section}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Enter goal title"
              placeholderTextColor={tokens.textSecondary}
            />
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe your goal"
              placeholderTextColor={tokens.textSecondary}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Category */}
          <View style={styles.section}>
            <Text style={styles.label}>Category</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.optionsScroll}
            >
              <View style={styles.optionsRow}>
                {GOAL_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.optionChip,
                      category === cat.value && {
                        backgroundColor: cat.color + '30',
                        borderColor: cat.color,
                      },
                    ]}
                    onPress={() => setCategory(cat.value)}
                  >
                    <View
                      style={[styles.categoryDot, { backgroundColor: cat.color }]}
                    />
                    <Text
                      style={[
                        styles.optionText,
                        category === cat.value && { color: cat.color },
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Timeframe */}
          <View style={styles.section}>
            <Text style={styles.label}>Timeframe</Text>
            <View style={styles.optionsGrid}>
              {TIMEFRAME_OPTIONS.map((tf) => (
                <TouchableOpacity
                  key={tf.value}
                  style={[
                    styles.optionChip,
                    styles.gridChip,
                    timeframe === tf.value && styles.optionChipActive,
                  ]}
                  onPress={() => setTimeframe(tf.value)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      timeframe === tf.value && styles.optionTextActive,
                    ]}
                  >
                    {tf.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Priority */}
          <View style={styles.section}>
            <Text style={styles.label}>Priority</Text>
            <View style={styles.priorityRow}>
              {PRIORITY_OPTIONS.map((p) => (
                <TouchableOpacity
                  key={p.value}
                  style={[
                    styles.priorityChip,
                    priority === p.value && {
                      backgroundColor: PRIORITY_COLORS[p.value] + '20',
                      borderColor: PRIORITY_COLORS[p.value],
                    },
                  ]}
                  onPress={() => setPriority(p.value)}
                >
                  <Ionicons
                    name={p.icon as any}
                    size={16}
                    color={
                      priority === p.value
                        ? PRIORITY_COLORS[p.value]
                        : tokens.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.priorityText,
                      priority === p.value && { color: PRIORITY_COLORS[p.value] },
                    ]}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Dates */}
          <View style={styles.section}>
            <Text style={styles.label}>Duration</Text>
            <View style={styles.dateRow}>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowStartPicker(true)}
              >
                <Ionicons name="calendar-outline" size={18} color={tokens.textSecondary} />
                <View>
                  <Text style={styles.dateLabel}>Start</Text>
                  <Text style={styles.dateValue}>{formatDate(startDate)}</Text>
                </View>
              </TouchableOpacity>

              <Ionicons name="arrow-forward" size={20} color={tokens.textSecondary} />

              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowEndPicker(true)}
              >
                <Ionicons name="calendar-outline" size={18} color={tokens.textSecondary} />
                <View>
                  <Text style={styles.dateLabel}>End</Text>
                  <Text style={styles.dateValue}>{formatDate(endDate)}</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Target */}
          <View style={styles.section}>
            <Text style={styles.label}>Target</Text>
            <View style={styles.targetRow}>
              <TextInput
                style={[styles.input, styles.targetInput]}
                value={targetValue}
                onChangeText={setTargetValue}
                placeholder="100"
                placeholderTextColor={tokens.textSecondary}
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.input, styles.unitInput]}
                value={progressUnit}
                onChangeText={setProgressUnit}
                placeholder="percentage"
                placeholderTextColor={tokens.textSecondary}
              />
            </View>
          </View>

          {/* Estimated Hours */}
          <View style={styles.section}>
            <Text style={styles.label}>Estimated Hours (optional)</Text>
            <TextInput
              style={styles.input}
              value={estimatedHours}
              onChangeText={setEstimatedHours}
              placeholder="e.g., 40"
              placeholderTextColor={tokens.textSecondary}
              keyboardType="numeric"
            />
          </View>

          {/* Tags */}
          <View style={styles.section}>
            <Text style={styles.label}>Tags (comma-separated)</Text>
            <TextInput
              style={styles.input}
              value={tags}
              onChangeText={setTags}
              placeholder="e.g., growth, sales, marketing"
              placeholderTextColor={tokens.textSecondary}
            />
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Additional notes..."
              placeholderTextColor={tokens.textSecondary}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Spacer */}
          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Date Pickers */}
        {showStartPicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display="default"
            onChange={(event, date) => {
              setShowStartPicker(false);
              if (date) setStartDate(date);
            }}
          />
        )}

        {showEndPicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            display="default"
            minimumDate={startDate}
            onChange={(event, date) => {
              setShowEndPicker(false);
              if (date) setEndDate(date);
            }}
          />
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
};

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: tokens.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: tokens.border,
      backgroundColor: tokens.surface,
    },
    closeButton: {
      padding: 4,
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: tokens.textPrimary,
    },
    saveButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: tokens.accent,
    },
    saveButtonDisabled: {
      opacity: 0.5,
    },
    saveButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    content: {
      flex: 1,
      padding: 16,
    },
    section: {
      marginBottom: 20,
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: tokens.textSecondary,
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    input: {
      backgroundColor: tokens.surface,
      borderWidth: 1,
      borderColor: tokens.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: tokens.textPrimary,
    },
    textArea: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    optionsScroll: {
      marginHorizontal: -16,
      paddingHorizontal: 16,
    },
    optionsRow: {
      flexDirection: 'row',
      gap: 8,
    },
    optionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    optionChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: tokens.surface,
      borderWidth: 1,
      borderColor: tokens.border,
      gap: 6,
    },
    gridChip: {
      minWidth: '30%',
      justifyContent: 'center',
    },
    optionChipActive: {
      backgroundColor: tokens.accent + '20',
      borderColor: tokens.accent,
    },
    optionText: {
      fontSize: 13,
      color: tokens.textSecondary,
    },
    optionTextActive: {
      color: tokens.accent,
      fontWeight: '600',
    },
    categoryDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    priorityRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 8,
    },
    priorityChip: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: tokens.surface,
      borderWidth: 1,
      borderColor: tokens.border,
      gap: 6,
    },
    priorityText: {
      fontSize: 12,
      fontWeight: '500',
      color: tokens.textSecondary,
    },
    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    dateButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: tokens.surface,
      borderWidth: 1,
      borderColor: tokens.border,
      gap: 10,
    },
    dateLabel: {
      fontSize: 10,
      color: tokens.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    dateValue: {
      fontSize: 14,
      fontWeight: '500',
      color: tokens.textPrimary,
    },
    targetRow: {
      flexDirection: 'row',
      gap: 12,
    },
    targetInput: {
      flex: 1,
    },
    unitInput: {
      flex: 2,
    },
  });

export default GoalCreationModal;
