"use client";

import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemeTokens, useTheme } from "../theme/ThemeContext";
import { useApi } from "../lib/hooks/useApi";
import { clientsApi, testimonialsApi } from "../lib/api/endpoints";

interface TestimonialRequestModalProps {
  visible: boolean;
  onClose: () => void;
  clientId?: string;
  onRequestSent?: () => void;
}

interface ServiceLine {
  id: string;
  name: string;
  slug: string;
  route: string;
}

interface Service {
  id: string;
  name: string;
  descriptionTemplate?: string;
}

export default function TestimonialRequestModal({
  visible,
  onClose,
  clientId: propClientId,
  onRequestSent,
}: TestimonialRequestModalProps) {
  const { tokens } = useTheme();
  const styles = React.useMemo(() => createStyles(tokens), [tokens]);

  // State
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>(propClientId);
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [serviceLineSlug, setServiceLineSlug] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Fetch clients and service lines
  const { data: clients = [], loading: loadingClients } = useApi(
    () => clientsApi.getClients({ limit: 100 }),
    []
  );

  const { data: serviceLines = [], loading: loadingServiceLines } = useApi(
    async () => {
      const response = await fetch(
        `https://evangelosommer.com/api/service-lines`
      );
      const data = await response.json();
      console.log('[TestimonialRequestModal] Raw service lines response:', data);
      console.log('[TestimonialRequestModal] Service lines count:', data.data?.length || 0);
      console.log('[TestimonialRequestModal] Service lines:', data.data?.map((sl: any) => sl.name) || []);

      // Filter to only active service lines
      const activeLines = (data.data || []).filter((sl: any) => sl.isActive !== false);
      console.log('[TestimonialRequestModal] Active service lines:', activeLines.map((sl: any) => sl.name));

      return { success: true, data: activeLines };
    },
    []
  );

  // Get selected client
  const selectedClient = selectedClientId && clients
    ? clients.find((c: any) => c.id === selectedClientId)
    : null;

  // Filter clients for search
  const filteredClients = (clients || []).filter((c: any) =>
    c.name?.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
    c.company?.toLowerCase().includes(clientSearchQuery.toLowerCase())
  );

  // Get services for selected service line
  const getServicesForServiceLine = (slug: string): Service[] => {
    // This is a simplified version - in production, fetch from service-config API
    const mockServices: Record<string, Service[]> = {
      woodgreen: [
        { id: "lawn_mowing", name: "Lawn Mowing & Edging" },
        { id: "fall_cleanup", name: "Fall Cleanup" },
        { id: "spring_cleanup", name: "Spring Cleanup" },
      ],
      pupawalk: [
        { id: "dog_walk_30", name: "Dog Walking - 30 min" },
        { id: "dog_walk_60", name: "Dog Walking - 60 min" },
        { id: "pet_sitting", name: "Pet Sitting" },
      ],
      whiteknight: [
        { id: "snow_removal_single", name: "Snow Removal - Single Driveway" },
        { id: "snow_removal_double", name: "Snow Removal - Double Driveway" },
        { id: "salting", name: "Salting & De-icing" },
      ],
      creative: [
        { id: "web_dev", name: "Web Development" },
        { id: "ecommerce", name: "E-commerce" },
        { id: "digital_strategy", name: "Digital Strategy" },
      ],
    };

    return mockServices[slug] || [];
  };

  const services = serviceLineSlug ? getServicesForServiceLine(serviceLineSlug) : [];

  // Generate template message
  const getTemplateMessage = (): string => {
    const serviceLineName =
      serviceLines.find((sl: ServiceLine) => sl.slug === serviceLineSlug)?.name || "";
    if (serviceName && serviceLineName) {
      return `Thank you for choosing ${serviceName} from ${serviceLineName}! We'd greatly appreciate your feedback. Your testimonial helps us continue to provide exceptional service to our valued clients.`;
    }
    return `Thank you for choosing our services! We'd greatly appreciate your feedback. Your testimonial helps us continue to provide exceptional service to our valued clients.`;
  };

  const insertTemplateMessage = () => {
    if (serviceLineSlug && serviceName) {
      setMessage(getTemplateMessage());
    }
  };

  const handleSubmit = async () => {
    if (!selectedClient) {
      Alert.alert("Error", "Please select a client");
      return;
    }

    if (!selectedClient.email) {
      Alert.alert("Error", "Selected client does not have an email address");
      return;
    }

    if (!serviceLineSlug || !serviceName) {
      Alert.alert("Error", "Please select a service line and service");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await testimonialsApi.sendTestimonialRequest({
        clientId: selectedClient.id,
        serviceId: serviceLineSlug,
        serviceName,
        message,
      });

      if (response.success) {
        setSuccess(true);
        onRequestSent?.();

        // Close modal after 2 seconds
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        Alert.alert("Error", response.error || "Failed to send testimonial request");
      }
    } catch (err) {
      Alert.alert("Error", "An error occurred while sending the request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedClientId(propClientId);
      setClientSearchQuery("");
      setServiceLineSlug("");
      setSelectedServiceId("");
      setServiceName("");
      setMessage("");
      setSuccess(false);
      onClose();
    }
  };

  // Reset state when modal opens
  useEffect(() => {
    if (visible && propClientId) {
      setSelectedClientId(propClientId);
    }
  }, [visible, propClientId]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Request Testimonial</Text>
            <TouchableOpacity
              onPress={handleClose}
              disabled={isSubmitting}
              style={styles.closeButton}
            >
              <Feather name="x" size={24} color={tokens.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.scrollContentContainer}
            showsVerticalScrollIndicator={false}
          >
            {success ? (
              <View style={styles.successContainer}>
                <Feather name="check-circle" size={64} color="#10b981" />
                <Text style={[styles.successTitle, { color: tokens.textPrimary }]}>
                  Request Sent Successfully!
                </Text>
                <Text style={[styles.successText, { color: tokens.textSecondary }]}>
                  A testimonial request has been created for {selectedClient?.name}.
                </Text>
              </View>
            ) : (
              <>
                {/* Client Selection */}
                {!propClientId && (
                  <View style={styles.section}>
                    <Text style={[styles.label, { color: tokens.textPrimary }]}>
                      Select Client *
                    </Text>
                    <TextInput
                      style={[styles.searchInput, { color: tokens.textPrimary, borderColor: tokens.border }]}
                      value={clientSearchQuery}
                      onChangeText={setClientSearchQuery}
                      placeholder="Search clients..."
                      placeholderTextColor={tokens.textSecondary}
                    />
                    <ScrollView
                      style={[styles.clientList, { borderColor: tokens.border }]}
                      nestedScrollEnabled
                    >
                      {loadingClients ? (
                        <ActivityIndicator size="small" color={tokens.accent} />
                      ) : filteredClients.length === 0 ? (
                        <Text style={[styles.emptyText, { color: tokens.textSecondary }]}>
                          No clients found
                        </Text>
                      ) : (
                        filteredClients.map((client: any) => (
                          <TouchableOpacity
                            key={client.id}
                            onPress={() => setSelectedClientId(client.id)}
                            style={[
                              styles.clientItem,
                              {
                                backgroundColor:
                                  selectedClientId === client.id
                                    ? tokens.surface
                                    : "transparent",
                                borderColor: tokens.border,
                              },
                            ]}
                          >
                            <Text style={[styles.clientName, { color: tokens.textPrimary }]}>
                              {client.name}
                            </Text>
                            <Text style={[styles.clientEmail, { color: tokens.textSecondary }]}>
                              {client.email || "No email"}
                            </Text>
                          </TouchableOpacity>
                        ))
                      )}
                    </ScrollView>
                  </View>
                )}

                {/* Selected Client Info */}
                {selectedClient && (
                  <View style={[styles.section, styles.selectedClientCard, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
                    <Text style={[styles.selectedClientLabel, { color: tokens.textSecondary }]}>
                      {propClientId ? "Client" : "Selected Client"}
                    </Text>
                    <Text style={[styles.selectedClientName, { color: tokens.textPrimary }]}>
                      {selectedClient.name}
                    </Text>
                    <Text style={[styles.selectedClientEmail, { color: tokens.textSecondary }]}>
                      {selectedClient.email || "No email address"}
                    </Text>
                    {!propClientId && (
                      <TouchableOpacity onPress={() => setSelectedClientId(undefined)}>
                        <Text style={styles.changeClient}>Change Client</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Service Line Selection */}
                <View style={styles.section}>
                  <Text style={[styles.label, { color: tokens.textPrimary }]}>
                    1. Service Line *
                  </Text>
                  <View style={[styles.pickerContainer, { borderColor: tokens.border }]}>
                    {loadingServiceLines ? (
                      <ActivityIndicator size="small" color={tokens.accent} />
                    ) : (
                      <ScrollView
                        style={styles.pickerScroll}
                        nestedScrollEnabled={true}
                      >
                        <TouchableOpacity
                          style={styles.pickerItem}
                          onPress={() => {
                            setServiceLineSlug("");
                            setSelectedServiceId("");
                            setServiceName("");
                          }}
                        >
                          <Text style={[styles.pickerItemText, { color: tokens.textSecondary }]}>
                            Select a service line...
                          </Text>
                        </TouchableOpacity>
                        {serviceLines.map((line: ServiceLine) => (
                          <TouchableOpacity
                            key={line.id}
                            style={[
                              styles.pickerItem,
                              serviceLineSlug === line.slug && {
                                backgroundColor: tokens.accent + "20",
                              },
                            ]}
                            onPress={() => {
                              setServiceLineSlug(line.slug);
                              setSelectedServiceId("");
                              setServiceName("");
                            }}
                          >
                            <Text
                              style={[
                                styles.pickerItemText,
                                {
                                  color:
                                    serviceLineSlug === line.slug
                                      ? tokens.accent
                                      : tokens.textPrimary,
                                },
                              ]}
                            >
                              {line.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    )}
                  </View>
                </View>

                {/* Service Selection */}
                {serviceLineSlug && (
                  <View style={styles.section}>
                    <Text style={[styles.label, { color: tokens.textPrimary }]}>
                      2. Select Service *
                    </Text>
                    <View style={[styles.pickerContainer, { borderColor: tokens.border }]}>
                      <ScrollView
                        style={styles.pickerScroll}
                        nestedScrollEnabled={true}
                      >
                        <TouchableOpacity
                          style={styles.pickerItem}
                          onPress={() => {
                            setSelectedServiceId("");
                            setServiceName("");
                          }}
                        >
                          <Text style={[styles.pickerItemText, { color: tokens.textSecondary }]}>
                            Choose a service...
                          </Text>
                        </TouchableOpacity>
                        {services.map((service) => (
                          <TouchableOpacity
                            key={service.id}
                            style={[
                              styles.pickerItem,
                              selectedServiceId === service.id && {
                                backgroundColor: tokens.accent + "20",
                              },
                            ]}
                            onPress={() => {
                              setSelectedServiceId(service.id);
                              setServiceName(service.name);
                            }}
                          >
                            <Text
                              style={[
                                styles.pickerItemText,
                                {
                                  color:
                                    selectedServiceId === service.id
                                      ? tokens.accent
                                      : tokens.textPrimary,
                                },
                              ]}
                            >
                              {service.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  </View>
                )}

                {/* Message */}
                <View style={styles.section}>
                  <View style={styles.messageLabelRow}>
                    <Text style={[styles.label, { color: tokens.textPrimary }]}>
                      Personal Message (Optional)
                    </Text>
                    {serviceLineSlug && serviceName && (
                      <TouchableOpacity
                        onPress={insertTemplateMessage}
                        style={[styles.templateButton, { borderColor: tokens.accent }]}
                      >
                        <Text style={[styles.templateButtonText, { color: tokens.accent }]}>
                          Use Template
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {serviceLineSlug && serviceName && !message && (
                    <View style={[styles.templatePreview, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
                      <Text style={[styles.templatePreviewLabel, { color: tokens.textSecondary }]}>
                        Template Preview:
                      </Text>
                      <Text style={[styles.templatePreviewText, { color: tokens.textPrimary }]}>
                        {getTemplateMessage()}
                      </Text>
                    </View>
                  )}

                  <TextInput
                    style={[styles.messageInput, { color: tokens.textPrimary, borderColor: tokens.border }]}
                    value={message}
                    onChangeText={setMessage}
                    placeholder="Add a personal message..."
                    placeholderTextColor={tokens.textSecondary}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>

                {/* Actions */}
                <View style={styles.actions}>
                  <TouchableOpacity
                    onPress={handleClose}
                    disabled={isSubmitting}
                    style={[styles.button, styles.cancelButton, { borderColor: tokens.border }]}
                  >
                    <Text style={[styles.buttonText, { color: tokens.textPrimary }]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={
                      isSubmitting ||
                      !selectedClient ||
                      !selectedClient.email ||
                      !serviceLineSlug ||
                      !serviceName
                    }
                    style={[
                      styles.button,
                      styles.submitButton,
                      { backgroundColor: tokens.accent },
                      (isSubmitting ||
                        !selectedClient ||
                        !selectedClient.email ||
                        !serviceLineSlug ||
                        !serviceName) && styles.buttonDisabled,
                    ]}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color={tokens.background} />
                    ) : (
                      <>
                        <Feather name="send" size={16} color={tokens.background} />
                        <Text style={[styles.buttonText, { color: tokens.background }]}>
                          Send Request
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      justifyContent: "flex-end",
    },
    modalContainer: {
      backgroundColor: tokens.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: "85%",
      paddingBottom: Platform.OS === "ios" ? 34 : 20,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: tokens.border,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: tokens.textPrimary,
      fontFamily: "Bytesized-Regular",
      textTransform: "uppercase",
    },
    closeButton: {
      padding: 4,
    },
    content: {
      padding: 16,
    },
    scrollContentContainer: {
      paddingBottom: 40,
    },
    section: {
      marginBottom: 20,
    },
    label: {
      fontSize: 12,
      fontWeight: "700",
      marginBottom: 8,
      fontFamily: "lores-9-wide",
      textTransform: "uppercase",
    },
    searchInput: {
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      fontSize: 14,
      fontFamily: "lores-9-wide",
      marginBottom: 12,
    },
    clientList: {
      maxHeight: 200,
      borderWidth: 1,
      borderRadius: 8,
      padding: 8,
    },
    clientItem: {
      padding: 12,
      borderBottomWidth: 1,
      marginBottom: 4,
    },
    clientName: {
      fontSize: 14,
      fontWeight: "700",
      fontFamily: "lores-9-wide",
      marginBottom: 4,
    },
    clientEmail: {
      fontSize: 12,
      fontFamily: "lores-9-wide",
    },
    emptyText: {
      fontSize: 13,
      textAlign: "center",
      padding: 16,
      fontFamily: "lores-9-wide",
    },
    selectedClientCard: {
      padding: 16,
      borderRadius: 8,
      borderWidth: 1,
    },
    selectedClientLabel: {
      fontSize: 10,
      fontFamily: "lores-9-wide",
      textTransform: "uppercase",
      marginBottom: 8,
    },
    selectedClientName: {
      fontSize: 16,
      fontWeight: "700",
      fontFamily: "lores-9-wide",
      marginBottom: 4,
    },
    selectedClientEmail: {
      fontSize: 13,
      fontFamily: "lores-9-wide",
      marginBottom: 8,
    },
    changeClient: {
      fontSize: 12,
      color: "#ef4444",
      fontFamily: "lores-9-wide",
    },
    pickerContainer: {
      borderWidth: 1,
      borderRadius: 8,
      maxHeight: 200,
    },
    pickerScroll: {
      padding: 4,
    },
    pickerItem: {
      padding: 12,
      borderRadius: 6,
    },
    pickerItemText: {
      fontSize: 14,
      fontFamily: "lores-9-wide",
    },
    messageLabelRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    templateButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      borderWidth: 1,
    },
    templateButtonText: {
      fontSize: 10,
      fontWeight: "700",
      fontFamily: "lores-9-wide",
      textTransform: "uppercase",
    },
    templatePreview: {
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      marginBottom: 12,
    },
    templatePreviewLabel: {
      fontSize: 10,
      fontFamily: "lores-9-wide",
      textTransform: "uppercase",
      marginBottom: 8,
    },
    templatePreviewText: {
      fontSize: 12,
      fontFamily: "lores-9-wide",
      fontStyle: "italic",
    },
    messageInput: {
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      fontSize: 14,
      fontFamily: "lores-9-wide",
      minHeight: 100,
    },
    actions: {
      flexDirection: "row",
      gap: 12,
      marginTop: 8,
    },
    button: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      padding: 14,
      borderRadius: 8,
      gap: 8,
    },
    cancelButton: {
      borderWidth: 1,
    },
    submitButton: {},
    buttonDisabled: {
      opacity: 0.5,
    },
    buttonText: {
      fontSize: 12,
      fontWeight: "700",
      fontFamily: "lores-9-wide",
      textTransform: "uppercase",
    },
    successContainer: {
      alignItems: "center",
      padding: 32,
      gap: 16,
    },
    successTitle: {
      fontSize: 18,
      fontWeight: "700",
      fontFamily: "Bytesized-Regular",
      textAlign: "center",
    },
    successText: {
      fontSize: 14,
      fontFamily: "lores-9-wide",
      textAlign: "center",
    },
  });
