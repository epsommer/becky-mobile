"use client";

import { useState, useEffect } from "react";
import {
  Receipt,
  ReceiptItem,
  CreateReceiptData,
  DEFAULT_TAX_CONFIG,
} from "../types/billing";
import { Client } from "../types/client";
import { lockScroll, unlockScroll } from "../lib/modal-scroll-lock";
import { getServiceById } from "../lib/service-config";

interface BillingReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReceiptCreated?: (receipt: Receipt) => void;
  existingReceiptId?: string;
  initialClientId?: string;
}

interface ReceiptFormData {
  clientId: string;
  items: ReceiptItem[];
  paymentMethod: "cash" | "card" | "e-transfer" | "check" | "other";
  paymentDate: string;
  serviceDate: string;
  notes: string;
}

interface ServiceLineData {
  id: string;
  name: string;
  route: string;
  slug: string;
}

// Helper function to get services for a service line
function getServicesForServiceLine(serviceLineSlug: string) {
  const service = getServiceById(serviceLineSlug);
  if (!service || !service.serviceTypes) return [];

  return service.serviceTypes.map((serviceType, index) => ({
    id: `${serviceLineSlug}_${index}`,
    name: serviceType.name,
    descriptionTemplate: serviceType.descriptionTemplate,
    unitPrice: 0,
  }));
}

export default function BillingReceiptModal({
  isOpen,
  onClose,
  onReceiptCreated,
  existingReceiptId,
  initialClientId,
}: BillingReceiptModalProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [formData, setFormData] = useState<ReceiptFormData>({
    clientId: "",
    items: [],
    paymentMethod: "cash",
    paymentDate: new Date().toISOString().split("T")[0],
    serviceDate: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [createdReceipt, setCreatedReceipt] = useState<Receipt | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [serviceLines, setServiceLines] = useState<ServiceLineData[]>([]);
  const [selectedServiceLine, setSelectedServiceLine] = useState<string>("");
  const [editableDescriptions, setEditableDescriptions] = useState<Set<string>>(
    new Set()
  );
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Fetch clients on mount
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await fetch("/api/clients");
        if (response.ok) {
          const data = await response.json();
          setClients(data.data || []);
        }
      } catch (error) {
        console.error("Error fetching clients:", error);
      }
    };

    fetchClients();
  }, []);

  // Fetch service lines on mount
  useEffect(() => {
    const fetchServiceLines = async () => {
      try {
        const response = await fetch("/api/service-lines");
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setServiceLines(data.data);
          }
        }
      } catch (error) {
        console.error("Error fetching service lines:", error);
      }
    };

    fetchServiceLines();
  }, []);

  // Disable body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      lockScroll();
    } else {
      unlockScroll();
    }

    return () => {
      unlockScroll();
    };
  }, [isOpen]);

  // Load existing receipt data if editing, or reset form if creating new
  useEffect(() => {
    const initializeForm = async () => {
      if (!isOpen) return;

      if (existingReceiptId) {
        // Load existing receipt for editing
        try {
          console.log('[BillingReceiptModal] Loading receipt for editing:', existingReceiptId);
          const response = await fetch(`/api/billing/receipts/${existingReceiptId}`);
          if (response.ok) {
            const data = await response.json();
            const receipt = data.receipt;
            console.log('[BillingReceiptModal] Receipt data loaded:', receipt);

            // Ensure all items have unique IDs
            const itemsWithIds = (receipt.items || []).map((item: any, index: number) => ({
              ...item,
              id: item.id || `loaded_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`
            }));

            setFormData({
              clientId: receipt.clientId || initialClientId || "",
              items: itemsWithIds,
              paymentMethod: receipt.paymentMethod || "cash",
              paymentDate: receipt.paymentDate
                ? new Date(receipt.paymentDate).toISOString().split("T")[0]
                : new Date().toISOString().split("T")[0],
              serviceDate: receipt.serviceDate
                ? new Date(receipt.serviceDate).toISOString().split("T")[0]
                : new Date().toISOString().split("T")[0],
              notes: receipt.notes || "",
            });
            setIsPaid(receipt.status === "paid");

            // Set service line if items exist
            if (receipt.items && receipt.items.length > 0) {
              const firstItem = receipt.items[0];
              if (firstItem.serviceType) {
                console.log('[BillingReceiptModal] Setting service line:', firstItem.serviceType);
                console.log('[BillingReceiptModal] Receipt items:', receipt.items);
                setSelectedServiceLine(firstItem.serviceType);
              }
            }
          }
        } catch (error) {
          console.error("Error loading receipt for editing:", error);
        }
      } else {
        // Reset form for new receipt
        console.log('[BillingReceiptModal] Initializing new receipt form');
        setFormData({
          clientId: initialClientId || "",
          items: [],
          paymentMethod: "cash",
          paymentDate: new Date().toISOString().split("T")[0],
          serviceDate: new Date().toISOString().split("T")[0],
          notes: "",
        });
        setSelectedServiceLine("");
        setEditableDescriptions(new Set());
        setValidationErrors([]);
        setIsSubmitting(false);
        setIsSending(false);
        setCreatedReceipt(null);
        setIsPaid(false);
      }
    };

    initializeForm();
  }, [isOpen, existingReceiptId, initialClientId]);

  function createEmptyLineItem(): ReceiptItem {
    return {
      id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      description: "",
      serviceType: selectedServiceLine,
      serviceTitle: "",
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      taxable: true,
      billingMode: "quantity",
    };
  }

  const addLineItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, createEmptyLineItem()],
    }));
  };

  const removeLineItem = (index: number) => {
    if (formData.items.length > 1) {
      setFormData((prev) => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index),
      }));
    }
  };

  const updateLineItem = (
    index: number,
    field: keyof ReceiptItem,
    value: any,
  ) => {
    setFormData((prev) => {
      const newItems = [...prev.items];
      newItems[index] = {
        ...newItems[index],
        [field]: value,
        totalPrice:
          field === "quantity" || field === "unitPrice"
            ? (field === "quantity" ? value : newItems[index].quantity) *
              (field === "unitPrice" ? value : newItems[index].unitPrice)
            : newItems[index].totalPrice,
      };
      return { ...prev, items: newItems };
    });
  };

  const toggleDescriptionEdit = (itemId: string) => {
    setEditableDescriptions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  // Validation function
  const validateForm = () => {
    const errors: string[] = [];

    // Check if client is selected
    if (!formData.clientId) {
      errors.push("Please select a client");
    }

    // Check if service line is selected
    if (!selectedServiceLine) {
      errors.push("Please select a service line");
    }

    // Check if at least one item exists
    if (formData.items.length === 0) {
      errors.push("Please add at least one service item");
    }

    // Validate each item
    formData.items.forEach((item, index) => {
      if (!item.description || item.description.trim() === "") {
        errors.push(`Item ${index + 1}: Please select a service`);
      }
      if (item.quantity <= 0) {
        errors.push(
          `Item ${index + 1}: Quantity/Hours must be greater than 0`
        );
      }
      if (item.unitPrice <= 0) {
        errors.push(`Item ${index + 1}: Unit price must be greater than 0`);
      }
    });

    setValidationErrors(errors);
    return errors.length === 0;
  };

  // Run validation whenever form changes
  useEffect(() => {
    validateForm();
  }, [formData, selectedServiceLine]);

  const handleServiceSelection = (index: number, serviceName: string) => {
    const services = getServicesForServiceLine(selectedServiceLine);
    const selectedService = services.find((s) => s.name === serviceName);

    if (selectedService) {
      setFormData((prev) => {
        const newItems = [...prev.items];
        newItems[index] = {
          ...newItems[index],
          serviceTitle: selectedService.name,
          description: selectedService.descriptionTemplate,
          unitPrice: selectedService.unitPrice,
          totalPrice: newItems[index].quantity * selectedService.unitPrice,
        };
        return { ...prev, items: newItems };
      });
    }
  };

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  const hasAnyTaxableItems = () => {
    return formData.items.some((item) => item.taxable);
  };

  const calculateTax = () => {
    const taxableAmount = formData.items
      .filter((item) => item.taxable)
      .reduce((sum, item) => sum + item.totalPrice, 0);
    return taxableAmount * DEFAULT_TAX_CONFIG.rate;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    // Final validation check
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const receiptData = {
        clientId: formData.clientId,
        items: formData.items.map((item) => ({
          description: item.description,
          serviceType: item.serviceType,
          serviceTitle: item.serviceTitle,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          taxable: item.taxable,
          billingMode: item.billingMode || "quantity",
        })),
        paymentMethod: formData.paymentMethod,
        paymentDate: new Date(formData.paymentDate),
        serviceDate: new Date(formData.serviceDate),
        notes: formData.notes || undefined,
        status: isPaid ? "paid" : "draft",
      };

      let response;
      let isEdit = !!existingReceiptId;

      if (isEdit) {
        // Update existing receipt
        response = await fetch(`/api/billing/receipts/${existingReceiptId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(receiptData),
        });
      } else {
        // Create new receipt
        response = await fetch("/api/billing/receipts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(receiptData),
        });
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Failed to ${isEdit ? 'update' : 'create'} receipt`);
      }

      // Success
      const receipt = result.receipt;
      console.log(`Receipt ${receipt.receiptNumber} ${isEdit ? 'updated' : 'created'} successfully`);
      setCreatedReceipt(receipt);
      alert(`Receipt ${receipt.receiptNumber} ${isEdit ? 'updated' : 'created'} successfully!`);

      // Close modal after successful edit
      if (isEdit) {
        if (onReceiptCreated) {
          await onReceiptCreated(receipt);
        }
        onClose();
      } else {
        // For new receipts, call callback then close
        if (onReceiptCreated) {
          await onReceiptCreated(receipt);
        }
        onClose();
      }
    } catch (error) {
      console.error(`Error ${existingReceiptId ? 'updating' : 'creating'} receipt:`, error);
      alert(`Failed to ${existingReceiptId ? 'update' : 'create'} receipt: ${(error as Error).message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSend = async () => {
    if (!createdReceipt) return;

    const selectedClient = clients.find((c) => c.id === formData.clientId);
    if (!selectedClient) return;

    setIsSending(true);

    try {
      if (!selectedClient.email) {
        alert("Client has no email address. Cannot send receipt.");
        return;
      }

      console.log(`Sending receipt ${createdReceipt.receiptNumber} to ${selectedClient.email}`);
      const emailResponse = await fetch(
        `/api/billing/receipts/${createdReceipt.id}/send-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            clientEmail: selectedClient.email,
            clientName: selectedClient.name,
          }),
        }
      );

      const emailResult = await emailResponse.json();

      if (emailResult.success) {
        alert(
          `Receipt ${createdReceipt.receiptNumber} sent to ${selectedClient.email}!`
        );
        onClose();
      } else {
        console.error("Email sending failed:", emailResult.error);
        alert(
          `Email failed to send: ${emailResult.error || "Unknown error"}`
        );
      }
    } catch (emailError) {
      console.error("Error sending receipt email:", emailError);
      alert("Failed to send receipt email");
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  const selectedClient = clients.find((c) => c.id === formData.clientId);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-[100]" onClick={onClose} />

      {/* Modal container - single column */}
      <div className="fixed inset-y-0 right-0 left-0 lg:left-64 z-[101] flex items-start justify-center p-4 sm:p-6 md:p-8 overflow-y-auto pointer-events-none">
        <div className="neo-container max-w-4xl w-full max-h-[calc(100vh-8rem)] sm:max-h-[calc(100vh-12rem)] md:max-h-[calc(100vh-16rem)] mt-16 sm:mt-20 md:mt-16 mb-8 overflow-y-auto pointer-events-auto">
                <div className="neo-inset border-b border-foreground/10 p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-foreground uppercase tracking-wide font-primary">
                      {existingReceiptId ? 'Edit Receipt' : 'Create Receipt'}
                    </h2>
                    <button
                      onClick={onClose}
                      className="neo-icon-button transition-transform hover:scale-[1.1]"
                      disabled={isSubmitting}
                      aria-label="Close"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                <form onSubmit={handleCreate} className="p-6">
                  {/* Client Selection */}
                  <div className="mb-6">
                    <h3 className="text-base sm:text-lg font-bold text-foreground mb-3 uppercase tracking-wide font-primary">
                      Select Client
                    </h3>
                    <select
                      value={formData.clientId}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, clientId: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-sm font-primary neo-inset focus:ring-2 focus:ring-foreground/20 transition-all"
                      required
                    >
                      <option value="">Choose a client...</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                    {selectedClient && (
                      <div className="mt-2 p-2 neo-inset text-xs text-muted-foreground font-primary">
                        {selectedClient.email && <div>Email: {selectedClient.email}</div>}
                        {selectedClient.phone && <div>Phone: {selectedClient.phone}</div>}
                      </div>
                    )}
                  </div>

                  {/* Service Line Selection */}
                  <div className="mb-6">
                    <h3 className="text-base sm:text-lg font-bold text-foreground mb-3 uppercase tracking-wide font-primary">
                      Select Service Line
                    </h3>
                    <div className="p-3 neo-inset border-l-4 border-tactical-gold mb-4">
                      <p className="text-xs text-muted-foreground font-primary mb-3">
                        <strong className="text-foreground">Workflow:</strong> Select a service line for this receipt. All services must be from the same line.
                      </p>
                      <select
                        value={selectedServiceLine}
                        onChange={(e) => {
                          const newServiceLine = e.target.value;
                          setSelectedServiceLine(newServiceLine);
                          // Automatically add first blank service item
                          setFormData(prev => ({
                            ...prev,
                            items: newServiceLine ? [{
                              id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                              description: "",
                              serviceType: newServiceLine,
                              serviceTitle: "",
                              quantity: 1,
                              unitPrice: 0,
                              totalPrice: 0,
                              taxable: true,
                              billingMode: "quantity",
                            }] : []
                          }));
                        }}
                        className="w-full px-3 py-2 text-sm font-primary neo-inset focus:ring-2 focus:ring-foreground/20 transition-all"
                      >
                        <option value="">Choose a service line...</option>
                        {serviceLines
                          .filter((line) => getServiceById(line.slug))
                          .map((line) => (
                            <option key={line.id} value={line.slug}>
                              {line.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  {/* Service Items Section */}
                  {selectedServiceLine && (
                    <div className="mb-6">
                      <h3 className="text-base sm:text-lg font-bold text-foreground uppercase tracking-wide font-primary mb-4">
                        Services Provided
                      </h3>

                      {/* Line Items */}
                      <div className="space-y-3">
                        {formData.items.map((item, index) => (
                          <div key={`${item.id}-${index}`} className="p-3 neo-inset">
                            <div className="space-y-3">
                              {/* Service Selection */}
                              <div>
                                <label className="block text-xs font-bold text-foreground mb-1 uppercase tracking-wide font-primary">
                                  Select Service *
                                </label>
                                <select
                                  value={item.serviceTitle || ""}
                                  onChange={(e) =>
                                    handleServiceSelection(index, e.target.value)
                                  }
                                  className="w-full px-3 py-2 text-sm font-primary neo-inset focus:ring-2 focus:ring-foreground/20 transition-all"
                                >
                                  <option value="">Choose a service...</option>
                                  {getServicesForServiceLine(selectedServiceLine).map(
                                    (service) => (
                                      <option key={service.id} value={service.name}>
                                        {service.name}
                                      </option>
                                    ),
                                  )}
                                </select>
                              </div>

                              {/* Description */}
                              {item.description && (
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <label className="text-xs font-bold text-foreground uppercase tracking-wide font-primary">
                                      Description
                                    </label>
                                    <button
                                      type="button"
                                      onClick={() => toggleDescriptionEdit(item.id)}
                                      className="p-1 hover:bg-foreground/5 rounded transition-colors"
                                      aria-label={
                                        editableDescriptions.has(item.id)
                                          ? "Lock description"
                                          : "Edit description"
                                      }
                                    >
                                      <svg
                                        className="w-3.5 h-3.5"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                        />
                                      </svg>
                                    </button>
                                  </div>
                                  <textarea
                                    value={item.description}
                                    onChange={(e) =>
                                      updateLineItem(index, "description", e.target.value)
                                    }
                                    rows={2}
                                    disabled={!editableDescriptions.has(item.id)}
                                    className={`w-full px-3 py-2 text-sm font-primary neo-inset transition-all resize-none ${
                                      editableDescriptions.has(item.id)
                                        ? "focus:ring-2 focus:ring-foreground/20 cursor-text"
                                        : "cursor-not-allowed opacity-75"
                                    }`}
                                    placeholder="Edit the service description..."
                                  />
                                </div>
                              )}

                              {/* Billing Mode */}
                              <div className="flex items-center gap-2 pb-2">
                                <span className="text-xs font-bold text-foreground uppercase tracking-wide font-primary">
                                  Billing Mode:
                                </span>
                                <div className="flex items-center gap-1 neo-inset px-2 py-1 rounded">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateLineItem(index, "billingMode", "quantity")
                                    }
                                    className={`px-3 py-1 text-xs font-bold uppercase font-primary rounded transition-all ${
                                      (item.billingMode || "quantity") === "quantity"
                                        ? "neo-button-active"
                                        : "text-muted-foreground hover:text-foreground"
                                    }`}
                                  >
                                    Qty
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateLineItem(index, "billingMode", "hours")
                                    }
                                    className={`px-3 py-1 text-xs font-bold uppercase font-primary rounded transition-all ${
                                      item.billingMode === "hours"
                                        ? "neo-button-active"
                                        : "text-muted-foreground hover:text-foreground"
                                    }`}
                                  >
                                    Hrs
                                  </button>
                                </div>
                              </div>

                              {/* Quantity and Price */}
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-bold text-foreground mb-1 uppercase tracking-wide font-primary">
                                    {item.billingMode === "hours" ? "Hrs *" : "Qty *"}
                                  </label>
                                  <input
                                    type="number"
                                    min={item.billingMode === "hours" ? "0" : "1"}
                                    step={item.billingMode === "hours" ? "0.25" : "1"}
                                    value={item.quantity}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      // Allow empty string during editing
                                      if (value === '') {
                                        updateLineItem(index, "quantity", 0);
                                      } else {
                                        const parsed = parseFloat(value);
                                        if (!isNaN(parsed)) {
                                          updateLineItem(index, "quantity", parsed);
                                        }
                                      }
                                    }}
                                    className="w-full px-3 py-2 text-sm font-primary neo-inset focus:ring-2 focus:ring-foreground/20 transition-all"
                                    required
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-bold text-foreground mb-1 uppercase tracking-wide font-primary">
                                    {item.billingMode === "hours"
                                      ? "Hourly Rate *"
                                      : "Unit Price *"}
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.unitPrice}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      // Allow empty string during editing
                                      if (value === '') {
                                        updateLineItem(index, "unitPrice", 0);
                                      } else {
                                        const parsed = parseFloat(value);
                                        if (!isNaN(parsed)) {
                                          updateLineItem(index, "unitPrice", parsed);
                                        }
                                      }
                                    }}
                                    onFocus={(e) => {
                                      if (!existingReceiptId && item.unitPrice === 0) {
                                        const input = e.target as HTMLInputElement;
                                        input.value = '';
                                        input.select();
                                      }
                                    }}
                                    className="w-full px-3 py-2 text-sm font-primary neo-inset focus:ring-2 focus:ring-foreground/20 transition-all"
                                    placeholder="0.00"
                                    required
                                  />
                                </div>
                              </div>

                              {/* Total */}
                              <div>
                                <label className="block text-xs font-bold text-foreground mb-1 uppercase tracking-wide font-primary">
                                  Total
                                </label>
                                <div className="px-3 py-2 text-sm font-primary neo-container font-bold">
                                  ${item.totalPrice.toFixed(2)}
                                </div>
                              </div>

                              {/* Tax and Delete */}
                              <div className="flex items-center justify-between pt-2 border-t border-foreground/10">
                                <label className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={item.taxable}
                                    onChange={(e) =>
                                      updateLineItem(index, "taxable", e.target.checked)
                                    }
                                    className="w-4 h-4"
                                  />
                                  <span className="ml-2 text-xs text-muted-foreground font-primary uppercase font-bold">
                                    Taxable
                                  </span>
                                </label>
                                {formData.items.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeLineItem(index)}
                                    className="neo-button-sm px-3 py-1.5 text-xs uppercase font-bold font-primary text-red-600 hover:bg-red-50 transition-all"
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Add Service Button */}
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={addLineItem}
                          className="neo-button-sm px-4 py-2 text-xs uppercase font-bold font-primary transition-transform hover:scale-[1.02] w-full sm:w-auto"
                        >
                          + Add Service
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Payment Details */}
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-foreground mb-4 uppercase tracking-wide font-primary">
                      Payment Details
                    </h3>

                    {/* Payment Status Checkbox */}
                    <div className="mb-4 neo-inset p-4 rounded">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isPaid}
                          onChange={(e) => setIsPaid(e.target.checked)}
                          className="w-5 h-5 cursor-pointer"
                        />
                        <div>
                          <span className="text-sm font-bold text-foreground uppercase tracking-wide font-primary">
                            Client Has Paid
                          </span>
                          <p className="text-xs text-muted-foreground font-primary mt-1">
                            Check this box if the client has already paid for this receipt
                          </p>
                        </div>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-foreground mb-2 uppercase tracking-wide font-primary">
                          Payment Method *
                        </label>
                        <select
                          value={formData.paymentMethod}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              paymentMethod: e.target.value as any,
                            }))
                          }
                          className="w-full px-4 py-3 font-primary neo-inset focus:ring-2 focus:ring-foreground/20 transition-all"
                          required
                        >
                          <option value="cash">Cash</option>
                          <option value="card">Credit/Debit Card</option>
                          <option value="e-transfer">E-Transfer</option>
                          <option value="check">Check</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-foreground mb-2 uppercase tracking-wide font-primary">
                          Service Date *
                        </label>
                        <input
                          type="date"
                          value={formData.serviceDate}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              serviceDate: e.target.value,
                            }))
                          }
                          className="w-full px-4 py-3 font-primary neo-inset focus:ring-2 focus:ring-foreground/20 transition-all"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-foreground mb-2 uppercase tracking-wide font-primary">
                          Payment Date *
                        </label>
                        <input
                          type="date"
                          value={formData.paymentDate}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              paymentDate: e.target.value,
                            }))
                          }
                          className="w-full px-4 py-3 font-primary neo-inset focus:ring-2 focus:ring-foreground/20 transition-all"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Totals Summary */}
                  <div className="mb-6">
                    <div className="neo-inset p-4">
                      <h3 className="text-lg font-bold text-foreground mb-3 uppercase tracking-wide font-primary">
                        Receipt Summary
                      </h3>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Subtotal:</span>
                          <span>${calculateSubtotal().toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>
                            Tax (
                            {hasAnyTaxableItems()
                              ? `${(DEFAULT_TAX_CONFIG.rate * 100).toFixed(1)}%`
                              : "Not Applicable"}
                            ):
                          </span>
                          <span>
                            {hasAnyTaxableItems()
                              ? `$${calculateTax().toFixed(2)}`
                              : "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between text-lg font-semibold border-t pt-2">
                          <span>Total:</span>
                          <span>${calculateTotal().toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="mb-6">
                    <label className="block text-sm font-bold text-foreground mb-2 uppercase tracking-wide font-primary">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, notes: e.target.value }))
                      }
                      rows={3}
                      className="w-full px-4 py-3 font-primary neo-inset focus:ring-2 focus:ring-foreground/20 transition-all placeholder:text-muted-foreground/50 placeholder:font-normal"
                      placeholder="Additional notes or details..."
                    />
                  </div>

                  {/* Validation Errors */}
                  {validationErrors.length > 0 && (
                    <div className="mb-6 p-4 neo-inset border-l-4 border-red-500">
                      <h4 className="text-sm font-bold text-red-600 mb-2 uppercase tracking-wide font-primary">
                        Please fix the following errors:
                      </h4>
                      <ul className="space-y-1">
                        {validationErrors.map((error, index) => (
                          <li
                            key={index}
                            className="text-xs text-red-600 font-primary flex items-start"
                          >
                            <span className="mr-2">•</span>
                            <span>{error}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={isSubmitting || isSending}
                      className="neo-button px-6 py-3 uppercase tracking-wide font-bold font-primary transition-transform hover:scale-[1.02] disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    {!createdReceipt ? (
                      <button
                        type="submit"
                        disabled={isSubmitting || validationErrors.length > 0}
                        className="neo-button-active px-6 py-3 uppercase tracking-wide font-bold font-primary transition-transform hover:scale-[1.02] disabled:opacity-50"
                      >
                        {isSubmitting
                          ? (existingReceiptId ? "Updating..." : "Creating...")
                          : (existingReceiptId ? "Update Receipt" : "Create Receipt")
                        }
                      </button>
                    ) : (
                      isPaid && (
                        <button
                          type="button"
                          onClick={handleSend}
                          disabled={isSending || !selectedClient?.email}
                          className="neo-button-active px-6 py-3 uppercase tracking-wide font-bold font-primary transition-transform hover:scale-[1.02] disabled:opacity-50"
                          title={!selectedClient?.email ? "Client has no email address" : "Send receipt to client"}
                        >
                          {isSending ? "Sending..." : "Send Receipt"}
                        </button>
                      )
                    )}
                  </div>
                </form>
        </div>
      </div>
    </>
  );
}
