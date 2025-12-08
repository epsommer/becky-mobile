"use client";

import React, { useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/ThemeContext";

interface DatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDate: (date: Date) => void;
  initialDate?: Date;
  title?: string;
  minimumDate?: Date;
  maximumDate?: Date;
}

export default function DatePickerModal({
  isOpen,
  onClose,
  onSelectDate,
  initialDate = new Date(),
  title = "Select Date",
  minimumDate,
  maximumDate,
}: DatePickerModalProps) {
  const { tokens } = useTheme();
  const [selectedDate, setSelectedDate] = useState(initialDate);

  const handleConfirm = () => {
    onSelectDate(selectedDate);
    onClose();
  };

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      onClose();
      if (date) {
        onSelectDate(date);
      }
    } else if (date) {
      setSelectedDate(date);
    }
  };

  if (!isOpen) return null;

  // On Android, the date picker is a modal by default
  if (Platform.OS === 'android') {
    return (
      <DateTimePicker
        value={selectedDate}
        mode="date"
        display="default"
        onChange={handleDateChange}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
      />
    );
  }

  // On iOS, we show it in a custom modal
  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={[styles.modalContent, { backgroundColor: tokens.surface }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={[styles.header, { borderBottomColor: tokens.border }]}>
            <Text style={[styles.title, { color: tokens.textPrimary }]}>
              {title}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={20} color={tokens.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.pickerContainer}>
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="spinner"
              onChange={handleDateChange}
              minimumDate={minimumDate}
              maximumDate={maximumDate}
              textColor={tokens.textPrimary}
            />
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { borderColor: tokens.border }]}
              onPress={onClose}
            >
              <Text style={[styles.buttonText, { color: tokens.textSecondary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.confirmButton, { backgroundColor: tokens.accent }]}
              onPress={handleConfirm}
            >
              <Text style={[styles.buttonText, { color: tokens.background }]}>
                Confirm
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    maxWidth: 400,
    borderRadius: 16,
    padding: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontFamily: "Bytesized-Regular",
    fontWeight: "700",
  },
  closeButton: {
    padding: 4,
  },
  pickerContainer: {
    paddingVertical: 16,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    borderWidth: 1,
  },
  confirmButton: {
    // backgroundColor set dynamically
  },
  buttonText: {
    fontSize: 14,
    fontFamily: "lores-9-wide",
    fontWeight: "700",
  },
});
