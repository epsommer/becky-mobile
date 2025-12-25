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
import {
  Client,
  CreateInvoiceData,
  InvoiceItem,
  PaymentTerms,
  createEmptyInvoiceItem,
  calculateDefaultDueDate,
  getPaymentTermsLabel,
  DEFAULT_TAX_CONFIG,
} from "../../types/billing";
import { billingApi } from "../../lib/api/endpoints/billing";
import { clientsApi } from "../../lib/api/endpoints/clients";
import DatePickerModal from "../shared/DatePickerModal";
import { useServiceLines } from "../../hooks/useServiceLines";

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvoiceCreated?: (invoice: any) => void;
  initialClientId?: string;
  invoiceId?: string; // If provided, modal is in edit mode
}

export default function InvoiceModal({
  isOpen,
  onClose,
  onInvoiceCreated,
  initialClientId,
  invoiceId,
}: InvoiceModalProps) {
  const { tokens } = useTheme();
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isEditMode = !!invoiceId;

  const [selectedClientId, setSelectedClientId] = useState(initialClientId || "");
  const [selectedServiceLineId, setSelectedServiceLineId] = useState<string>("");
  const [items, setItems] = useState<InvoiceItem[]>([createEmptyInvoiceItem()]);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>("net30");
  const [invoiceDate, setInvoiceDate] = useState(new Date());
  const [dueDate, setDueDate] = useState(calculateDefaultDueDate("net30"));
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"draft" | "sent">("draft");
  const [editableDescriptions, setEditableDescriptions] = useState<Set<string>>(new Set());
  const [originalDescriptions, setOriginalDescriptions] = useState<Map<string, string>>(new Map());

  const [showInvoiceDatePicker, setShowInvoiceDatePicker] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);

  // Load service lines
  const { serviceLines, loading: loadingServiceLines } = useServiceLines();

  // Load clients
  useEffect(() => {
    const loadClients = async () => {
      try {
        setLoadingClients(true);
        const response = await clientsApi.getClients({ limit: 100 });
        if (response.success && response.data) {
          setClients(response.data);
        } else {
          console.error('[InvoiceModal] Failed to load clients:', response);
          setClients([]);
        }
      } catch (error) {
        console.error('[InvoiceModal] Error loading clients:', error);
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

  // Load invoice data in edit mode
  useEffect(() => {
    const loadInvoice = async () => {
      if (!isEditMode || !invoiceId || !isOpen) return;

      try {
        setLoadingInvoice(true);
        const response = await billingApi.getInvoice(invoiceId);

        if (!response.success || !response.data) {
          throw new Error('Failed to load invoice data');
        }

        const invoice = response.data as any;

        // Populate form with invoice data
        setSelectedClientId(invoice.clientId);
        setItems(invoice.items);
        setPaymentTerms(invoice.paymentTerms || "net30");
        setInvoiceDate(new Date(invoice.invoiceDate));
        setDueDate(new Date(invoice.dueDate));
        setNotes(invoice.notes || "");
        setStatus(invoice.status === 'paid' ? 'sent' : invoice.status);
      } catch (error) {
        console.error('[InvoiceModal] Error loading invoice:', error);
        Alert.alert('Error', 'Failed to load invoice data');
        onClose();
      } finally {
        setLoadingInvoice(false);
      }
    };

    loadInvoice();
  }, [isEditMode, invoiceId, isOpen]);

  // Reset form when modal opens (only in create mode)
  useEffect(() => {
    if (isOpen && !isEditMode) {
      setSelectedClientId(initialClientId || "");
      setSelectedServiceLineId("");
      setItems([createEmptyInvoiceItem()]);
      setPaymentTerms("net30");
      setInvoiceDate(new Date());
      setDueDate(calculateDefaultDueDate("net30"));
      setNotes("");
      setStatus("draft");
      setEditableDescriptions(new Set());
      setOriginalDescriptions(new Map());
    }
  }, [isOpen, isEditMode, initialClientId]);

  // Update due date when payment terms change
  useEffect(() => {
    if (!isEditMode) {
      setDueDate(calculateDefaultDueDate(paymentTerms, invoiceDate));
    }
  }, [paymentTerms, invoiceDate, isEditMode]);

  const addLineItem = () => {
    setItems([...items, createEmptyInvoiceItem()]);
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

  // Handle service line change
  const handleServiceLineChange = (serviceLineId: string) => {
    setSelectedServiceLineId(serviceLineId);
    // Reset items when service line changes
    if (serviceLineId) {
      setItems([createEmptyInvoiceItem()]);
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

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const taxableAmount = items
    .filter(item => item.taxable)
    .reduce((sum, item) => sum + item.totalPrice, 0);
  const tax = taxableAmount * DEFAULT_TAX_CONFIG.rate;
  const total = subtotal + tax;

  const validateForm = (): string[] => {
    const errors: string[] = [];

    if (!selectedClientId) {
      errors.push("Please select a client");
    }

    if (!selectedServiceLineId && !isEditMode) {
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

  const handleSubmit = async (sendImmediately: boolean = false) => {
    const errors = validateForm();
    if (errors.length > 0) {
      Alert.alert('Validation Error', errors.join('\n'));
      return;
    }

    setSubmitting(true);

    try {
      const invoiceData: CreateInvoiceData = {
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
        paymentTerms,
        invoiceDate,
        dueDate,
        notes: notes || undefined,
        status: sendImmediately ? 'sent' : 'draft',
      };

      let response;
      if (isEditMode && invoiceId) {
        response = await billingApi.updateInvoice(invoiceId, invoiceData as any);
        if (!response.success || !response.data) {
          throw new Error('Failed to update invoice');
        }
        Alert.alert('Success', `Invoice ${(response.data as any).invoiceNumber} updated successfully!`);
      } else {
        response = await billingApi.createInvoice(invoiceData as any);
        if (!response.success || !response.data) {
          throw new Error('Failed to create invoice');
        }

        const invoiceNumber = (response.data as any).invoiceNumber;
        if (sendImmediately) {
          // Send the invoice immediately after creation
          try {
            await billingApi.sendInvoice((response.data as any).id);
            Alert.alert('Success', `Invoice ${invoiceNumber} created and sent!`);
          } catch (sendError) {
            Alert.alert('Partial Success', `Invoice ${invoiceNumber} created but failed to send. You can send it later from the invoice list.`);
          }
        } else {
          Alert.alert('Success', `Invoice ${invoiceNumber} created as draft!`);
        }
      }

      if (onInvoiceCreated) {
        onInvoiceCreated(response.data);
      }

      onClose();
    } catch (error) {
      console.error(`[InvoiceModal] Error ${isEditMode ? 'updating' : 'creating'} invoice:`, error);
      Alert.alert('Error', error instanceof Error ? error.message : `Failed to ${isEditMode ? 'update' : 'create'} invoice`);
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
              {isEditMode ? 'Edit Invoice' : 'Create Invoice'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={tokens.textPrimary} />
            </TouchableOpacity>
          </View>

          {loadingInvoice ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={tokens.accent} />
              <Text style={[styles.loadingText, { color: tokens.textSecondary }]}>
                Loading invoice...
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
              {(selectedServiceLineId || isEditMode) && (
                <View style={[styles.section, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
                  <Text style={[styles.sectionTitle, { color: tokens.textPrimary }]}>Services to Invoice</Text>
                  {items.map((item, index) => (
                    <View key={item.id} style={[styles.lineItem, { backgroundColor: tokens.background, borderColor: tokens.border }]}>
                      {/* Service Selection */}
                      {selectedServiceLine && (
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
                      )}

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
                          Taxable ({(DEFAULT_TAX_CONFIG.rate * 100).toFixed(0)}% {DEFAULT_TAX_CONFIG.name})
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
                                Tax ({(DEFAULT_TAX_CONFIG.rate * 100).toFixed(0)}%): ${(item.totalPrice * DEFAULT_TAX_CONFIG.rate).toFixed(2)}
                              </Text>
                              <Text style={[styles.totalText, { color: tokens.accent }]}>
                                Total: ${(item.totalPrice * (1 + DEFAULT_TAX_CONFIG.rate)).toFixed(2)}
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

              {/* Invoice Summary */}
              <View style={[styles.section, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
                <Text style={[styles.sectionTitle, { color: tokens.textPrimary }]}>Invoice Summary</Text>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: tokens.textSecondary }]}>Subtotal</Text>
                  <Text style={[styles.summaryValue, { color: tokens.textPrimary }]}>${subtotal.toFixed(2)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: tokens.textSecondary }]}>
                    Tax ({DEFAULT_TAX_CONFIG.name} {(DEFAULT_TAX_CONFIG.rate * 100).toFixed(0)}%)
                  </Text>
                  <Text style={[styles.summaryValue, { color: tokens.textPrimary }]}>
                    {taxableAmount > 0 ? `$${tax.toFixed(2)}` : 'N/A'}
                  </Text>
                </View>
                <View style={[styles.summaryRow, styles.totalRow, { borderTopColor: tokens.border }]}>
                  <Text style={[styles.totalLabel, { color: tokens.textPrimary }]}>Total Amount Due</Text>
                  <Text style={[styles.totalValue, { color: tokens.accent }]}>${total.toFixed(2)}</Text>
                </View>
              </View>

              {/* Payment Terms */}
              <View style={[styles.section, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
                <Text style={[styles.sectionTitle, { color: tokens.textPrimary }]}>Payment Terms</Text>

                <View style={styles.field}>
                  <Text style={[styles.label, { color: tokens.textSecondary }]}>Payment Terms *</Text>
                  <View style={styles.paymentTermsButtons}>
                    {(['due_on_receipt', 'net15', 'net30', 'net45'] as PaymentTerms[]).map((term) => (
                      <TouchableOpacity
                        key={term}
                        style={[
                          styles.termButton,
                          {
                            backgroundColor: paymentTerms === term ? tokens.accent : tokens.background,
                            borderColor: tokens.border
                          }
                        ]}
                        onPress={() => setPaymentTerms(term)}
                      >
                        <Text style={[
                          styles.termButtonText,
                          { color: paymentTerms === term ? tokens.background : tokens.textPrimary }
                        ]}>
                          {getPaymentTermsLabel(term)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Dates */}
                <View style={styles.dateRow}>
                  <View style={[styles.field, styles.halfField]}>
                    <Text style={[styles.label, { color: tokens.textSecondary }]}>Invoice Date *</Text>
                    <TouchableOpacity
                      style={[styles.dateButton, { backgroundColor: tokens.background, borderColor: tokens.border }]}
                      onPress={() => setShowInvoiceDatePicker(true)}
                    >
                      <Ionicons name="calendar-outline" size={16} color={tokens.textSecondary} />
                      <Text style={[styles.dateButtonText, { color: tokens.textPrimary }]}>
                        {formatDate(invoiceDate)}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={[styles.field, styles.halfField]}>
                    <Text style={[styles.label, { color: tokens.textSecondary }]}>Due Date *</Text>
                    <TouchableOpacity
                      style={[styles.dateButton, { backgroundColor: tokens.background, borderColor: tokens.border }]}
                      onPress={() => setShowDueDatePicker(true)}
                    >
                      <Ionicons name="calendar-outline" size={16} color={tokens.textSecondary} />
                      <Text style={[styles.dateButtonText, { color: tokens.textPrimary }]}>
                        {formatDate(dueDate)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Notes */}
              <View style={[styles.section, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
                <Text style={[styles.sectionTitle, { color: tokens.textPrimary }]}>Notes & Terms (Optional)</Text>
                <TextInput
                  style={[styles.notesInput, { color: tokens.textPrimary, borderColor: tokens.border }]}
                  placeholder="Additional terms, conditions, or notes for this invoice..."
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
                  style={[styles.actionButton, styles.draftButton, { borderColor: tokens.accent }]}
                  onPress={() => handleSubmit(false)}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color={tokens.accent} />
                  ) : (
                    <Text style={[styles.actionButtonText, { color: tokens.accent }]}>
                      {isEditMode ? 'Update' : 'Save Draft'}
                    </Text>
                  )}
                </TouchableOpacity>
                {!isEditMode && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.sendButton, { backgroundColor: tokens.accent }]}
                    onPress={() => handleSubmit(true)}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color={tokens.background} />
                    ) : (
                      <Text style={[styles.actionButtonText, { color: tokens.background }]}>
                        Create & Send
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Date Pickers */}
      <DatePickerModal
        isOpen={showInvoiceDatePicker}
        onClose={() => setShowInvoiceDatePicker(false)}
        onSelectDate={setInvoiceDate}
        initialDate={invoiceDate}
        title="Invoice Date"
      />

      <DatePickerModal
        isOpen={showDueDatePicker}
        onClose={() => setShowDueDatePicker(false)}
        onSelectDate={setDueDate}
        initialDate={dueDate}
        title="Due Date"
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
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
    padding: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
  },
  checkboxLabel: {
    fontSize: 14,
    fontFamily: "lores-9-wide",
    fontWeight: "600",
  },
  paymentTermsButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  termButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  termButtonText: {
    fontSize: 11,
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
    flex: 0.7,
  },
  draftButton: {
    borderWidth: 1,
    flex: 1,
  },
  sendButton: {
    flex: 1.3,
  },
  actionButtonText: {
    fontSize: 13,
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
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: "lores-9-wide",
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: "lores-9-wide",
    fontWeight: "600",
  },
  totalRow: {
    borderTopWidth: 2,
    paddingTop: 12,
    marginBottom: 0,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontFamily: "Bytesized-Regular",
    fontWeight: "700",
  },
  totalValue: {
    fontSize: 18,
    fontFamily: "Bytesized-Regular",
    fontWeight: "700",
  },
});
