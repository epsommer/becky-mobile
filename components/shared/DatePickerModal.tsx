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
  mode?: "date" | "time" | "datetime";
}

export default function DatePickerModal({
  isOpen,
  onClose,
  onSelectDate,
  initialDate = new Date(),
  title = "Select Date",
  minimumDate,
  maximumDate,
  mode = "date",
}: DatePickerModalProps) {
  const { tokens } = useTheme();
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [pickerMode, setPickerMode] = useState<"date" | "time">(mode === "time" ? "time" : "date");

  const handleConfirm = () => {
    // For datetime mode, only confirm after both date and time are set
    if (mode === "datetime" && pickerMode === "date") {
      setPickerMode("time");
      return;
    }
    onSelectDate(selectedDate);
    onClose();
    // Reset picker mode for next open
    setPickerMode(mode === "time" ? "time" : "date");
  };

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      if (date) {
        setSelectedDate(date);
        // For datetime mode on Android, switch to time picker after date selection
        if (mode === "datetime" && pickerMode === "date") {
          setPickerMode("time");
          return;
        }
        onSelectDate(date);
      }
      onClose();
      setPickerMode(mode === "time" ? "time" : "date");
    } else if (date) {
      setSelectedDate(date);
    }
  };

  const handleBack = () => {
    if (mode === "datetime" && pickerMode === "time") {
      setPickerMode("date");
    } else {
      onClose();
      setPickerMode(mode === "time" ? "time" : "date");
    }
  };

  if (!isOpen) return null;

  // On Android, the date picker is a modal by default
  if (Platform.OS === 'android') {
    return (
      <DateTimePicker
        value={selectedDate}
        mode={pickerMode}
        display="default"
        onChange={handleDateChange}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
      />
    );
  }

  // Get title based on mode and current picker step
  const getDisplayTitle = () => {
    if (mode === "datetime") {
      return pickerMode === "date" ? `${title} - Date` : `${title} - Time`;
    }
    return title;
  };

  // Get confirm button text
  const getConfirmText = () => {
    if (mode === "datetime" && pickerMode === "date") {
      return "Next";
    }
    return "Confirm";
  };

  // On iOS, we show it in a custom modal
  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={handleBack}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={handleBack}
      >
        <View
          style={[styles.modalContent, { backgroundColor: tokens.surface }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={[styles.header, { borderBottomColor: tokens.border }]}>
            <Text style={[styles.title, { color: tokens.textPrimary }]}>
              {getDisplayTitle()}
            </Text>
            <TouchableOpacity onPress={handleBack} style={styles.closeButton}>
              <Ionicons name="close" size={20} color={tokens.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Show selected date preview for datetime mode when picking time */}
          {mode === "datetime" && pickerMode === "time" && (
            <View style={[styles.datePreview, { backgroundColor: tokens.background, borderColor: tokens.border }]}>
              <Text style={[styles.datePreviewLabel, { color: tokens.textSecondary }]}>Selected Date</Text>
              <Text style={[styles.datePreviewValue, { color: tokens.textPrimary }]}>
                {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </Text>
            </View>
          )}

          <View style={styles.pickerContainer}>
            <DateTimePicker
              value={selectedDate}
              mode={pickerMode}
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
              onPress={handleBack}
            >
              <Text style={[styles.buttonText, { color: tokens.textSecondary }]}>
                {mode === "datetime" && pickerMode === "time" ? "Back" : "Cancel"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.confirmButton, { backgroundColor: tokens.accent }]}
              onPress={handleConfirm}
            >
              <Text style={[styles.buttonText, { color: tokens.background }]}>
                {getConfirmText()}
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
  datePreview: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  datePreviewLabel: {
    fontSize: 11,
    fontFamily: "lores-9-wide",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  datePreviewValue: {
    fontSize: 16,
    fontFamily: "Bytesized-Regular",
    fontWeight: "600",
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
