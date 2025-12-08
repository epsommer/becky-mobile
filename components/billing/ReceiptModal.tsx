"use client";

import React, { useState, useEffect } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/ThemeContext";
import { Client, CreateReceiptData, createEmptyReceiptItem, ReceiptItem } from "../../types/billing";
import { billingApi } from "../../lib/api/endpoints/billing";
import { clientsApi } from "../../lib/api/endpoints/clients";
import ReceiptLineItem from "./ReceiptLineItem";
import ReceiptSummary from "./ReceiptSummary";
import DatePickerModal from "../shared/DatePickerModal";
import { useServiceLines } from "../../hooks/useServiceLines";

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReceiptCreated?: (receipt: any) => void;
  initialClientId?: string;
  receiptId?: string; // If provided, modal is in edit mode
}

export default function ReceiptModal({
  isOpen,
  onClose,
  onReceiptCreated,
  initialClientId,
  receiptId,
}: ReceiptModalProps) {
  const { tokens } = useTheme();
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingReceipt, setLoadingReceipt] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isEditMode = !!receiptId;

  const [selectedClientId, setSelectedClientId] = useState(initialClientId || "");
  const [selectedServiceLineId, setSelectedServiceLineId] = useState<string>("");
  const [items, setItems] = useState([createEmptyReceiptItem()]);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "e-transfer" | "check" | "other">("cash");
  const [paymentDate, setPaymentDate] = useState(new Date());
  const [serviceDate, setServiceDate] = useState(new Date());
  const [notes, setNotes] = useState("");
  const [isPaid, setIsPaid] = useState(false);
  const [editableDescriptions, setEditableDescriptions] = useState<Set<string>>(new Set());
  const [originalDescriptions, setOriginalDescriptions] = useState<Map<string, string>>(new Map());

  const [showPaymentDatePicker, setShowPaymentDatePicker] = useState(false);
  const [showServiceDatePicker, setShowServiceDatePicker] = useState(false);

  // Load service lines
  const { serviceLines, loading: loadingServiceLines } = useServiceLines();

  // Debug logging
  React.useEffect(() => {
    console.log('[ReceiptModal] Service lines loaded:', serviceLines.length);
    serviceLines.forEach((line, idx) => {
      console.log(`[ReceiptModal] Service line ${idx}:`, line.category, `(${line.items?.length || 0} items)`);
      if (line.items && line.items.length > 0) {
        console.log(`[ReceiptModal] First 3 items:`, line.items.slice(0, 3).map(i => i.title));
      }
    });
  }, [serviceLines]);

  // Load clients
  useEffect(() => {
    const loadClients = async () => {
      try {
        setLoadingClients(true);
        const response = await clientsApi.getClients({ limit: 100 });
        if (response.success && response.data) {
          setClients(response.data);
        } else {
          console.error('[ReceiptModal] Failed to load clients:', response);
          setClients([]);
        }
      } catch (error) {
        console.error('[ReceiptModal] Error loading clients:', error);
        Alert.alert('Error', 'Failed to load clients');
        setClients([]);
      } finally {
        setLoadingClients(false);
      }
    };

    if (isOpen) {
      loadClients();
    }
  }, [isOpen]);

  // Load receipt data in edit mode
  useEffect(() => {
    const loadReceipt = async () => {
      if (!isEditMode || !receiptId || !isOpen) return;

      try {
        setLoadingReceipt(true);
        const response = await billingApi.getReceipt(receiptId);

        if (!response.success || !response.data) {
          throw new Error('Failed to load receipt data');
        }

        const receipt = response.data;

        // Populate form with receipt data
        setSelectedClientId(receipt.clientId);
        setItems(receipt.items);
        setPaymentMethod(receipt.paymentMethod);
        setPaymentDate(new Date(receipt.paymentDate));
        setServiceDate(new Date(receipt.serviceDate));
        setNotes(receipt.notes || "");
        setIsPaid(receipt.status === 'paid');
      } catch (error) {
        console.error('[ReceiptModal] Error loading receipt:', error);
        Alert.alert('Error', 'Failed to load receipt data');
        onClose();
      } finally {
        setLoadingReceipt(false);
      }
    };

    loadReceipt();
  }, [isEditMode, receiptId, isOpen]);

  // Reset form when modal opens (only in create mode)
  useEffect(() => {
    if (isOpen && !isEditMode) {
      setSelectedClientId(initialClientId || "");
      setSelectedServiceLineId("");
      setItems([createEmptyReceiptItem()]);
      setPaymentMethod("cash");
      setPaymentDate(new Date());
      setServiceDate(new Date());
      setNotes("");
      setIsPaid(false);
      setEditableDescriptions(new Set());
      setOriginalDescriptions(new Map());
    }
  }, [isOpen, isEditMode, initialClientId]);

  const addLineItem = () => {
    setItems([...items, createEmptyReceiptItem()]);
  };

  const removeLineItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    const item = newItems[index];

    if (field === 'quantity' || field === 'unitPrice') {
      item[field] = value;
      item.totalPrice = item.quantity * item.unitPrice;
    } else {
      (item as any)[field] = value;
    }

    setItems(newItems);
  };

  // Get selected service line
  const selectedServiceLine = serviceLines.find(line => line.id === selectedServiceLineId);

  // Debug logging for selected service line
  React.useEffect(() => {
    if (selectedServiceLineId) {
      console.log('[ReceiptModal] Selected service line ID:', selectedServiceLineId);
      console.log('[ReceiptModal] Found service line:', selectedServiceLine?.category);
      console.log('[ReceiptModal] Service line items:', selectedServiceLine?.items?.length || 0);
      if (selectedServiceLine?.items) {
        console.log('[ReceiptModal] Items:', selectedServiceLine.items.map(i => i.title).join(', '));
      }
    }
  }, [selectedServiceLineId, selectedServiceLine]);

  // Handle service line change
  const handleServiceLineChange = (serviceLineId: string) => {
    setSelectedServiceLineId(serviceLineId);
    // Reset items when service line changes
    if (serviceLineId) {
      setItems([createEmptyReceiptItem()]);
      setEditableDescriptions(new Set());
    } else {
      setItems([]);
    }
  };

  // Handle service selection for a line item
  const handleServiceSelect = (index: number, serviceItemId: string) => {
    if (!selectedServiceLine) return;

    const serviceItem = selectedServiceLine.items.find(item => item.id === serviceItemId);
    if (!serviceItem) return;

    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      serviceTitle: serviceItem.title,
      description: serviceItem.description || serviceItem.title,
      unitPrice: serviceItem.defaultPrice || 0,
      totalPrice: newItems[index].quantity * (serviceItem.defaultPrice || 0),
      billingMode: serviceItem.defaultBillingMode || 'quantity',
      serviceType: selectedServiceLine.category,
    };
    setItems(newItems);

    // Remove from editable set when a new service is selected
    const newEditableDescriptions = new Set(editableDescriptions);
    newEditableDescriptions.delete(newItems[index].id);
    setEditableDescriptions(newEditableDescriptions);
  };

  // Start editing description - store original
  const startEditingDescription = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (item && item.description) {
      const newOriginals = new Map(originalDescriptions);
      newOriginals.set(itemId, item.description);
      setOriginalDescriptions(newOriginals);

      const newEditableDescriptions = new Set(editableDescriptions);
      newEditableDescriptions.add(itemId);
      setEditableDescriptions(newEditableDescriptions);
    }
  };

  // Save description edits
  const saveDescriptionEdit = (itemId: string) => {
    const newEditableDescriptions = new Set(editableDescriptions);
    newEditableDescriptions.delete(itemId);
    setEditableDescriptions(newEditableDescriptions);

    const newOriginals = new Map(originalDescriptions);
    newOriginals.delete(itemId);
    setOriginalDescriptions(newOriginals);
  };

  // Cancel description edits - restore original
  const cancelDescriptionEdit = (itemId: string) => {
    const original = originalDescriptions.get(itemId);
    if (original) {
      const index = items.findIndex(i => i.id === itemId);
      if (index !== -1) {
        updateLineItem(index, 'description', original);
      }
    }

    const newEditableDescriptions = new Set(editableDescriptions);
    newEditableDescriptions.delete(itemId);
    setEditableDescriptions(newEditableDescriptions);

    const newOriginals = new Map(originalDescriptions);
    newOriginals.delete(itemId);
    setOriginalDescriptions(newOriginals);
  };

  const validateForm = (): string[] => {
    const errors: string[] = [];

    if (!selectedClientId) {
      errors.push("Please select a client");
    }

    if (!selectedServiceLineId) {
      errors.push("Please select a service line");
    }

    if (items.length === 0) {
      errors.push("Please add at least one service item");
    }

    items.forEach((item, index) => {
      if (!item.description || item.description.trim() === "") {
        errors.push(`Item ${index + 1}: Please enter a description`);
      }
      if (item.quantity <= 0) {
        errors.push(`Item ${index + 1}: Quantity must be greater than 0`);
      }
      if (item.unitPrice <= 0) {
        errors.push(`Item ${index + 1}: Unit price must be greater than 0`);
      }
    });

    return errors;
  };

  const handleSubmit = async () => {
    const errors = validateForm();
    if (errors.length > 0) {
      Alert.alert('Validation Error', errors.join('\n'));
      return;
    }

    setSubmitting(true);

    try {
      const receiptData: CreateReceiptData = {
        clientId: selectedClientId,
        items: items.map(item => ({
          description: item.description,
          serviceType: item.serviceType || 'general',
          serviceTitle: item.serviceTitle,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          taxable: item.taxable,
          billingMode: item.billingMode || 'quantity',
        })),
        paymentMethod,
        paymentDate,
        serviceDate,
        notes: notes || undefined,
        status: isPaid ? 'paid' : 'draft',
      };

      let response;
      if (isEditMode && receiptId) {
        response = await billingApi.updateReceipt(receiptId, receiptData as any);
        if (!response.success || !response.data) {
          throw new Error('Failed to update receipt');
        }
        Alert.alert('Success', `Receipt ${response.data.receiptNumber} updated successfully!`);
      } else {
        response = await billingApi.createReceipt(receiptData as any);
        if (!response.success || !response.data) {
          throw new Error('Failed to create receipt');
        }
        Alert.alert('Success', `Receipt ${response.data.receiptNumber} created successfully!`);
      }

      if (onReceiptCreated) {
        onReceiptCreated(response.data);
      }

      onClose();
    } catch (error) {
      console.error(`[ReceiptModal] Error ${isEditMode ? 'updating' : 'creating'} receipt:`, error);
      Alert.alert('Error', error instanceof Error ? error.message : `Failed to ${isEditMode ? 'update' : 'create'} receipt`);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (!isOpen) return null;

  const selectedClient = clients.find(c => c.id === selectedClientId);

  return (
    <>
      <Modal
        visible={isOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <SafeAreaView style={[styles.safeArea, { backgroundColor: tokens.background }]}>
          {/* Header */}
          <View style={[styles.header, { backgroundColor: tokens.surface, borderBottomColor: tokens.border }]}>
            <Text style={[styles.headerTitle, { color: tokens.textPrimary }]}>
              {isEditMode ? 'Edit Receipt' : 'Create Receipt'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={tokens.textPrimary} />
            </TouchableOpacity>
          </View>

          {loadingReceipt ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={tokens.accent} />
              <Text style={[styles.loadingText, { color: tokens.textSecondary }]}>
                Loading receipt...
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
              {/* Client Selection */}
              <View style={[styles.section, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
                <Text style={[styles.sectionTitle, { color: tokens.textPrimary }]}>Select Client *</Text>
              {loadingClients ? (
                <ActivityIndicator size="small" color={tokens.accent} />
              ) : (
                <>
                  <View style={[styles.picker, { backgroundColor: tokens.background, borderColor: tokens.border }]}>
                    <Picker
                      selectedValue={selectedClientId}
                      onValueChange={(itemValue) => setSelectedClientId(itemValue)}
                      style={{
                        color: tokens.textPrimary,
                      }}
                    >
                      <Picker.Item label="Choose a client..." value="" />
                      {clients.map((client) => (
                        <Picker.Item key={client.id} label={client.name} value={client.id} />
                      ))}
                    </Picker>
                  </View>
                  {selectedClient && (
                    <View style={[styles.clientInfo, { backgroundColor: tokens.background, borderColor: tokens.border }]}>
                      {selectedClient.email && (
                        <Text style={[styles.clientInfoText, { color: tokens.textSecondary }]}>
                          Email: {selectedClient.email}
                        </Text>
                      )}
                      {selectedClient.phone && (
                        <Text style={[styles.clientInfoText, { color: tokens.textSecondary }]}>
                          Phone: {selectedClient.phone}
                        </Text>
                      )}
                    </View>
                  )}
                </>
              )}
            </View>

            {/* Service Line Selection */}
            <View style={[styles.section, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
              <Text style={[styles.sectionTitle, { color: tokens.textPrimary }]}>Select Service Line *</Text>
              {loadingServiceLines ? (
                <ActivityIndicator size="small" color={tokens.accent} />
              ) : (
                <View style={[styles.picker, { backgroundColor: tokens.background, borderColor: tokens.border }]}>
                  <Picker
                    selectedValue={selectedServiceLineId}
                    onValueChange={handleServiceLineChange}
                    style={{
                      color: tokens.textPrimary,
                    }}
                  >
                    <Picker.Item label="Choose a service line..." value="" />
                    {serviceLines.map((line) => (
                      <Picker.Item key={line.id} label={line.category} value={line.id} />
                    ))}
                  </Picker>
                </View>
              )}
            </View>

            {/* Line Items */}
            {selectedServiceLineId && (
              <View style={[styles.section, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
                <Text style={[styles.sectionTitle, { color: tokens.textPrimary }]}>Services Provided</Text>
                {items.map((item, index) => (
                  <View key={item.id} style={[styles.lineItem, { backgroundColor: tokens.background, borderColor: tokens.border }]}>
                    {/* Service Selection */}
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: tokens.textSecondary }]}>Select Service *</Text>
                      <View style={[styles.picker, { backgroundColor: tokens.background, borderColor: tokens.border }]}>
                        <Picker
                          selectedValue={item.serviceTitle || ""}
                          onValueChange={(value) => handleServiceSelect(index, value)}
                          style={{ color: tokens.textPrimary }}
                        >
                          <Picker.Item label="Choose a service..." value="" />
                          {selectedServiceLine?.items.map((serviceItem) => (
                            <Picker.Item key={serviceItem.id} label={serviceItem.title} value={serviceItem.id} />
                          ))}
                        </Picker>
                      </View>
                    </View>

                    {/* Description with Edit Button */}
                    {item.description && (
                      <View style={styles.field}>
                        <View style={styles.descriptionHeader}>
                          <Text style={[styles.label, { color: tokens.textSecondary }]}>Description</Text>
                          <View style={styles.editButtonsRow}>
                            {editableDescriptions.has(item.id) ? (
                              <>
                                {/* Cancel Button */}
                                <TouchableOpacity
                                  onPress={() => cancelDescriptionEdit(item.id)}
                                  style={[styles.editButton, { borderColor: tokens.border }]}
                                >
                                  <Ionicons name="close" size={16} color={tokens.textSecondary} />
                                </TouchableOpacity>
                                {/* Save Button */}
                                <TouchableOpacity
                                  onPress={() => saveDescriptionEdit(item.id)}
                                  style={[
                                    styles.editButton,
                                    { backgroundColor: tokens.accent + '20', borderColor: tokens.accent }
                                  ]}
                                >
                                  <Ionicons name="checkmark" size={16} color={tokens.accent} />
                                </TouchableOpacity>
                              </>
                            ) : (
                              /* Edit Button */
                              <TouchableOpacity
                                onPress={() => startEditingDescription(item.id)}
                                style={[styles.editButton, { borderColor: tokens.border }]}
                              >
                                <Ionicons name="create-outline" size={16} color={tokens.textSecondary} />
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                        <TextInput
                          style={[
                            styles.descriptionInput,
                            {
                              color: tokens.textPrimary,
                              borderColor: tokens.border,
                              backgroundColor: editableDescriptions.has(item.id) ? tokens.background : tokens.surface,
                            }
                          ]}
                          value={item.description}
                          onChangeText={(value) => updateLineItem(index, "description", value)}
                          multiline
                          numberOfLines={3}
                          editable={editableDescriptions.has(item.id)}
                        />
                      </View>
                    )}

                    {/* Quantity and Price */}
                    <View style={styles.row}>
                      <View style={[styles.field, styles.halfField]}>
                        <Text style={[styles.label, { color: tokens.textSecondary }]}>
                          {item.billingMode === 'hours' ? 'Hours *' : 'Quantity *'}
                        </Text>
                        <TextInput
                          style={[styles.input, { color: tokens.textPrimary, borderColor: tokens.border }]}
                          value={String(item.quantity)}
                          onChangeText={(value) => updateLineItem(index, "quantity", parseFloat(value) || 0)}
                          keyboardType="numeric"
                        />
                      </View>
                      <View style={[styles.field, styles.halfField]}>
                        <Text style={[styles.label, { color: tokens.textSecondary }]}>Unit Price *</Text>
                        <TextInput
                          style={[styles.input, { color: tokens.textPrimary, borderColor: tokens.border }]}
                          value={String(item.unitPrice)}
                          onChangeText={(value) => updateLineItem(index, "unitPrice", parseFloat(value) || 0)}
                          keyboardType="numeric"
                        />
                      </View>
                    </View>

                    {/* Taxable Checkbox */}
                    <TouchableOpacity
                      style={styles.checkboxRow}
                      onPress={() => updateLineItem(index, "taxable", !item.taxable)}
                    >
                      <Ionicons name={item.taxable ? 'checkbox' : 'square-outline'} size={20} color={item.taxable ? tokens.accent : tokens.textSecondary} />
                      <Text style={[styles.checkboxLabel, { color: tokens.textPrimary }]}>
                        Taxable (13% HST)
                      </Text>
                    </TouchableOpacity>

                    {/* Total and Remove */}
                    <View style={styles.itemFooter}>
                      <View>
                        <Text style={[styles.totalText, { color: tokens.textPrimary }]}>
                          Subtotal: ${item.totalPrice.toFixed(2)}
                        </Text>
                        {item.taxable && (
                          <>
                            <Text style={[styles.taxText, { color: tokens.textSecondary }]}>
                              Tax (13%): ${(item.totalPrice * 0.13).toFixed(2)}
                            </Text>
                            <Text style={[styles.totalText, { color: tokens.accent }]}>
                              Total: ${(item.totalPrice * 1.13).toFixed(2)}
                            </Text>
                          </>
                        )}
                      </View>
                      {items.length > 1 && (
                        <TouchableOpacity
                          onPress={() => removeLineItem(index)}
                          style={[styles.removeButton, { borderColor: tokens.border }]}
                        >
                          <Ionicons name="trash-outline" size={16} color={tokens.textSecondary} />
                          <Text style={[styles.removeButtonText, { color: tokens.textSecondary }]}>Remove</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}

                {/* Add Service Button */}
                <TouchableOpacity
                  style={[styles.addButton, { borderColor: tokens.border }]}
                  onPress={addLineItem}
                >
                  <Ionicons name="add" size={18} color={tokens.accent} />
                  <Text style={[styles.addButtonText, { color: tokens.accent }]}>Add Another Service</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Totals Summary */}
            <ReceiptSummary items={items} />

            {/* Payment Details */}
            <View style={[styles.section, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
              <Text style={[styles.sectionTitle, { color: tokens.textPrimary }]}>Payment Details</Text>

              {/* Payment Status Checkbox */}
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setIsPaid(!isPaid)}
              >
                <View style={[
                  styles.checkbox,
                  {
                    borderColor: tokens.border,
                    backgroundColor: isPaid ? tokens.accent : 'transparent'
                  }
                ]}>
                  {isPaid && (
                    <Ionicons name="checkmark" size={16} color={tokens.background} />
                  )}
                </View>
                <View>
                  <Text style={[styles.checkboxLabel, { color: tokens.textPrimary }]}>
                    Client Has Paid
                  </Text>
                  <Text style={[styles.checkboxHint, { color: tokens.textSecondary }]}>
                    Check this if the client has already paid for this receipt
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Payment Method */}
              <View style={styles.field}>
                <Text style={[styles.label, { color: tokens.textSecondary }]}>Payment Method *</Text>
                <View style={styles.paymentMethods}>
                  {(['cash', 'card', 'e-transfer', 'check', 'other'] as const).map((method) => (
                    <TouchableOpacity
                      key={method}
                      style={[
                        styles.methodButton,
                        {
                          backgroundColor: paymentMethod === method ? tokens.accent : tokens.background,
                          borderColor: tokens.border
                        }
                      ]}
                      onPress={() => setPaymentMethod(method)}
                    >
                      <Text style={[
                        styles.methodButtonText,
                        { color: paymentMethod === method ? tokens.background : tokens.textPrimary }
                      ]}>
                        {method === 'e-transfer' ? 'E-Transfer' : method.charAt(0).toUpperCase() + method.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Dates */}
              <View style={styles.dateRow}>
                <View style={[styles.field, styles.halfField]}>
                  <Text style={[styles.label, { color: tokens.textSecondary }]}>Service Date *</Text>
                  <TouchableOpacity
                    style={[styles.dateButton, { backgroundColor: tokens.background, borderColor: tokens.border }]}
                    onPress={() => setShowServiceDatePicker(true)}
                  >
                    <Ionicons name="calendar-outline" size={16} color={tokens.textSecondary} />
                    <Text style={[styles.dateButtonText, { color: tokens.textPrimary }]}>
                      {formatDate(serviceDate)}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={[styles.field, styles.halfField]}>
                  <Text style={[styles.label, { color: tokens.textSecondary }]}>Payment Date *</Text>
                  <TouchableOpacity
                    style={[styles.dateButton, { backgroundColor: tokens.background, borderColor: tokens.border }]}
                    onPress={() => setShowPaymentDatePicker(true)}
                  >
                    <Ionicons name="calendar-outline" size={16} color={tokens.textSecondary} />
                    <Text style={[styles.dateButtonText, { color: tokens.textPrimary }]}>
                      {formatDate(paymentDate)}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Notes */}
            <View style={[styles.section, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
              <Text style={[styles.sectionTitle, { color: tokens.textPrimary }]}>Notes (Optional)</Text>
              <TextInput
                style={[styles.notesInput, { color: tokens.textPrimary, borderColor: tokens.border }]}
                placeholder="Additional notes or details..."
                placeholderTextColor={tokens.textSecondary}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton, { borderColor: tokens.border }]}
                onPress={onClose}
                disabled={submitting}
              >
                <Text style={[styles.actionButtonText, { color: tokens.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.createButton, { backgroundColor: tokens.accent }]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={tokens.background} />
                ) : (
                  <Text style={[styles.actionButtonText, { color: tokens.background }]}>
                    {isEditMode ? 'Update Receipt' : 'Create Receipt'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Date Pickers */}
      <DatePickerModal
        isOpen={showServiceDatePicker}
        onClose={() => setShowServiceDatePicker(false)}
        onSelectDate={setServiceDate}
        initialDate={serviceDate}
        title="Service Date"
      />

      <DatePickerModal
        isOpen={showPaymentDatePicker}
        onClose={() => setShowPaymentDatePicker(false)}
        onSelectDate={setPaymentDate}
        initialDate={paymentDate}
        title="Payment Date"
      />
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  loadingContainer: {
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
  headerTitle: {
    fontSize: 20,
    fontFamily: "Bytesized-Regular",
    fontWeight: "700",
  },
  closeButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  section: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Bytesized-Regular",
    fontWeight: "700",
    marginBottom: 12,
  },
  picker: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
  },
  clientInfo: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  clientInfoText: {
    fontSize: 12,
    fontFamily: "lores-9-wide",
    marginBottom: 4,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  addButtonText: {
    fontSize: 14,
    fontFamily: "lores-9-wide",
    fontWeight: "700",
  },
  field: {
    marginBottom: 16,
  },
  halfField: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontFamily: "lores-9-wide",
    fontWeight: "600",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 20,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxLabel: {
    fontSize: 14,
    fontFamily: "lores-9-wide",
    fontWeight: "700",
    marginBottom: 4,
  },
  checkboxHint: {
    fontSize: 11,
    fontFamily: "lores-9-wide",
  },
  paymentMethods: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  methodButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  methodButtonText: {
    fontSize: 12,
    fontFamily: "lores-9-wide",
    fontWeight: "700",
  },
  dateRow: {
    flexDirection: "row",
    gap: 12,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  dateButtonText: {
    fontSize: 13,
    fontFamily: "lores-9-wide",
    fontWeight: "600",
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "lores-9-wide",
    minHeight: 100,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
    marginBottom: 32,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    borderWidth: 1,
  },
  createButton: {
    // backgroundColor set dynamically
  },
  actionButtonText: {
    fontSize: 14,
    fontFamily: "lores-9-wide",
    fontWeight: "700",
  },
  lineItem: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  descriptionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  editButtonsRow: {
    flexDirection: "row",
    gap: 8,
  },
  editButton: {
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  descriptionInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    fontFamily: "lores-9-wide",
    minHeight: 80,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    fontFamily: "lores-9-wide",
  },
  itemFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  totalText: {
    fontSize: 14,
    fontFamily: "lores-9-wide",
    fontWeight: "700",
  },
  taxText: {
    fontSize: 12,
    fontFamily: "lores-9-wide",
    marginTop: 4,
  },
  checkboxLabel: {
    fontSize: 14,
    fontFamily: "lores-9-wide",
    marginLeft: 8,
  },
  removeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
  },
  removeButtonText: {
    fontSize: 12,
    fontFamily: "lores-9-wide",
    fontWeight: "600",
  },
});
