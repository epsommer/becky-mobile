"use client";

import { useState, useEffect } from "react";
import { Invoice, InvoiceItem, CreateInvoiceData, DEFAULT_TAX_CONFIG } from "../types/billing";
import { Client } from "../types/client";
import { lockScroll, unlockScroll } from '../lib/modal-scroll-lock';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  client?: Client | null;
  clients?: Client[];
  onInvoiceCreated?: (invoice: Invoice) => void;
  onClientChange?: (client: Client | null) => void;
}

interface InvoiceFormData {
  items: InvoiceItem[];
  paymentTerms: 'net15' | 'net30' | 'net45' | 'due_on_receipt';
  dueDate: string;
  notes: string;
}

const ServiceTemplates = {
  landscaping: [
    { description: 'Lawn Mowing', unitPrice: 50, serviceType: 'landscaping' as const },
    { description: 'Garden Maintenance', unitPrice: 75, serviceType: 'landscaping' as const },
    { description: 'Tree Trimming', unitPrice: 100, serviceType: 'landscaping' as const },
    { description: 'Seasonal Cleanup', unitPrice: 200, serviceType: 'landscaping' as const }
  ],
  snow_removal: [
    { description: 'Driveway Snow Removal', unitPrice: 40, serviceType: 'snow_removal' as const },
    { description: 'Walkway Clearing', unitPrice: 25, serviceType: 'snow_removal' as const },
    { description: 'Salt Application', unitPrice: 15, serviceType: 'snow_removal' as const }
  ],
  hair_cutting: [
    { description: 'Haircut', unitPrice: 30, serviceType: 'hair_cutting' as const },
    { description: 'Wash & Style', unitPrice: 25, serviceType: 'hair_cutting' as const },
    { description: 'Color Treatment', unitPrice: 80, serviceType: 'hair_cutting' as const }
  ],
  creative_development: [
    { description: 'UI/UX Design', unitPrice: 75, serviceType: 'creative_development' as const },
    { description: 'App Development', unitPrice: 100, serviceType: 'creative_development' as const },
    { description: '3D Graphics/Animation', unitPrice: 85, serviceType: 'creative_development' as const },
    { description: 'Network Administration', unitPrice: 90, serviceType: 'creative_development' as const }
  ]
};

export default function InvoiceModal({
  isOpen,
  onClose,
  client,
  clients = [],
  onInvoiceCreated,
  onClientChange,
}: InvoiceModalProps) {
  const [formData, setFormData] = useState<InvoiceFormData>({
    items: [createEmptyLineItem()],
    paymentTerms: 'net30',
    dueDate: calculateDefaultDueDate('net30'),
    notes: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(client || null);

  // Disable body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      lockScroll()
    } else {
      unlockScroll()
    }

    // Cleanup on unmount
    return () => {
      unlockScroll()
    }
  }, [isOpen]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      const defaultDueDate = calculateDefaultDueDate('net30');
      setFormData({
        items: [createEmptyLineItem()],
        paymentTerms: 'net30',
        dueDate: defaultDueDate,
        notes: ''
      });
      setIsSubmitting(false);
      // Default client selection if none passed
      if (!client && clients.length > 0) {
        setSelectedClient(clients[0]);
      } else if (client) {
        setSelectedClient(client);
      }
    }
  }, [isOpen, client, clients]);

  // Keep selection in sync when parent passes a different client
  useEffect(() => {
    if (client) {
      setSelectedClient(client);
    }
  }, [client]);

  // Update due date when payment terms change
  useEffect(() => {
    const newDueDate = calculateDefaultDueDate(formData.paymentTerms);
    setFormData(prev => ({ ...prev, dueDate: newDueDate }));
  }, [formData.paymentTerms]);

  function createEmptyLineItem(): InvoiceItem {
    return {
      id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      description: '',
      serviceType: 'landscaping',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      taxable: true
    };
  }

  function calculateDefaultDueDate(paymentTerms: InvoiceFormData['paymentTerms']): string {
    const now = new Date();
    let dueDate: Date;
    
    switch (paymentTerms) {
      case 'due_on_receipt':
        dueDate = now;
        break;
      case 'net15':
        dueDate = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
        break;
      case 'net30':
        dueDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        break;
      case 'net45':
        dueDate = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);
        break;
      default:
        dueDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    }
    
    return dueDate.toISOString().split('T')[0];
  }

  const addLineItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, createEmptyLineItem()]
    }));
  };

  const removeLineItem = (index: number) => {
    if (formData.items.length > 1) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }));
    }
  };

  const updateLineItem = (index: number, field: keyof InvoiceItem, value: any) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      newItems[index] = {
        ...newItems[index],
        [field]: value,
        totalPrice: field === 'quantity' || field === 'unitPrice' 
          ? (field === 'quantity' ? value : newItems[index].quantity) * 
            (field === 'unitPrice' ? value : newItems[index].unitPrice)
          : newItems[index].totalPrice
      };
      return { ...prev, items: newItems };
    });
  };

  const addTemplateItem = (template: { description: string; unitPrice: number; serviceType: any }) => {
    const newItem: InvoiceItem = {
      id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      description: template.description,
      serviceType: template.serviceType,
      quantity: 1,
      unitPrice: template.unitPrice,
      totalPrice: template.unitPrice,
      taxable: true
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
    setShowTemplates(false);
  };

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  const calculateTax = () => {
    const taxableAmount = formData.items
      .filter(item => item.taxable)
      .reduce((sum, item) => sum + item.totalPrice, 0);
    return taxableAmount * DEFAULT_TAX_CONFIG.rate;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate form
      if (formData.items.some(item => !item.description || item.unitPrice <= 0)) {
        alert('Please fill in all item details with valid prices');
        return;
      }

      if (!selectedClient) {
        alert('Please select a client before creating an invoice.');
        return;
      }

      const createData: CreateInvoiceData = {
        clientId: selectedClient.id,
        items: formData.items.map(item => ({
          description: item.description,
          serviceType: item.serviceType,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          taxable: item.taxable
        })),
        paymentTerms: formData.paymentTerms,
        dueDate: new Date(formData.dueDate),
        notes: formData.notes || undefined
      };

      const response = await fetch('/api/billing/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create invoice');
      }

      // Success
      alert(`Invoice ${result.invoice.invoiceNumber} created successfully!`);
      
      if (onInvoiceCreated) {
        onInvoiceCreated(result.invoice);
      }
      
      onClose();
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert(`Failed to create invoice: ${(error as Error).message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getServiceTemplates = () => {
    // Try to match client's service type to templates
    const currentClient = selectedClient || client;
    const serviceId = currentClient?.serviceId;
    if (serviceId === 'landscaping' || serviceId === 'lawn-care') {
      return ServiceTemplates.landscaping;
    } else if (serviceId === 'snow-removal') {
      return ServiceTemplates.snow_removal;
    } else if (serviceId === 'hair-cutting') {
      return ServiceTemplates.hair_cutting;
    } else if (serviceId === 'creative-development') {
      return ServiceTemplates.creative_development;
    }
    return ServiceTemplates.landscaping; // Default
  };

  const getPaymentTermsLabel = (terms: InvoiceFormData['paymentTerms']) => {
    switch (terms) {
      case 'due_on_receipt': return 'Due on Receipt';
      case 'net15': return 'Net 15 Days';
      case 'net30': return 'Net 30 Days';
      case 'net45': return 'Net 45 Days';
      default: return 'Net 30 Days';
    }
  };

  if (!isOpen) return null;

  const currentClient = selectedClient || client || null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-[100]" onClick={onClose} />

      {/* Modal container - accounts for sidebar on desktop */}
      <div className="fixed inset-y-0 right-0 left-0 lg:left-64 z-[101] flex items-start justify-center p-4 sm:p-6 md:p-8 overflow-y-auto pointer-events-none">
        <div className="neo-card max-w-4xl w-full max-h-[calc(100vh-8rem)] sm:max-h-[calc(100vh-12rem)] md:max-h-[calc(100vh-16rem)] mt-16 sm:mt-20 md:mt-16 mb-8 overflow-y-auto pointer-events-auto">
        <div className="flex items-center justify-between p-6 border-b border-neomorphic-border">
          <h2 className="text-xl font-bold font-primary uppercase tracking-wide text-foreground">
            Create Invoice{currentClient ? ` - ${currentClient.name}` : ''}
          </h2>
          <button
            onClick={onClose}
            className="neo-icon-button"
            disabled={isSubmitting}
            aria-label="Close invoice modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Client selection when opened standalone */}
          {clients.length > 0 && (
            <div className="mb-6">
              <label className="text-sm font-semibold text-foreground block mb-2">
                Client
              </label>
              <select
                className="w-full neo-input"
                value={currentClient?.id || ''}
                onChange={(e) => {
                  const nextClient = clients.find((c) => c.id === e.target.value) || null;
                  setSelectedClient(nextClient);
                  onClientChange?.(nextClient);
                }}
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Service Items Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold font-primary uppercase tracking-wide text-foreground">Services to Invoice</h3>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowTemplates(!showTemplates)}
                  className="neo-button text-sm"
                >
                  📋 Templates
                </button>
                <button
                  type="button"
                  onClick={addLineItem}
                  className="neo-button text-sm"
                >
                  + Add Service
                </button>
              </div>
            </div>

            {/* Service Templates */}
            {showTemplates && (
              <div className="mb-4 p-4 neo-inset rounded-lg">
                <h4 className="text-sm font-bold font-primary uppercase tracking-wide text-muted-foreground mb-2">Quick Add Templates:</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {getServiceTemplates().map((template, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => addTemplateItem(template)}
                      className="neo-button text-left p-2 text-sm"
                    >
                      <div className="font-bold font-primary text-foreground">{template.description}</div>
                      <div className="text-muted-foreground">${template.unitPrice}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Line Items */}
            <div className="space-y-3">
              {formData.items.map((item, index) => (
                <div key={item.id} className="grid grid-cols-12 gap-3 items-end p-3 neo-inset rounded-lg">
                  <div className="col-span-4">
                    <label className="block text-xs font-primary uppercase tracking-wide text-muted-foreground mb-1">
                      Description *
                    </label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                      className="neomorphic-input w-full text-sm"
                      placeholder="Service description"
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-primary uppercase tracking-wide text-muted-foreground mb-1">
                      Service Type
                    </label>
                    <select
                      value={item.serviceType}
                      onChange={(e) => updateLineItem(index, 'serviceType', e.target.value)}
                      className="neomorphic-input w-full text-sm"
                    >
                      <option value="landscaping">Landscaping</option>
                      <option value="snow_removal">Snow Removal</option>
                      <option value="hair_cutting">Hair Cutting</option>
                      <option value="creative_development">Creative Dev</option>
                      <option value="lawn_care">Lawn Care</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="consultation">Consultation</option>
                    </select>
                  </div>

                  <div className="col-span-1">
                    <label className="block text-xs font-primary uppercase tracking-wide text-muted-foreground mb-1">
                      Qty *
                    </label>
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                      className="neomorphic-input w-full text-sm"
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-primary uppercase tracking-wide text-muted-foreground mb-1">
                      Unit Price *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateLineItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                      className="neomorphic-input w-full text-sm"
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-primary uppercase tracking-wide text-muted-foreground mb-1">
                      Total
                    </label>
                    <div className="px-2 py-1 text-sm neo-inset rounded font-primary font-bold text-foreground text-center">
                      ${item.totalPrice.toFixed(2)}
                    </div>
                  </div>

                  <div className="col-span-1 flex items-center space-x-1">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={item.taxable}
                        onChange={(e) => updateLineItem(index, 'taxable', e.target.checked)}
                        className="rounded border-neomorphic-border text-tactical-gold focus:ring-tactical-gold"
                      />
                      <span className="ml-1 text-xs font-primary text-muted-foreground">Tax</span>
                    </label>
                    {formData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLineItem(index)}
                        className="neo-icon-button"
                        aria-label="Remove line item"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Terms & Due Date */}
          <div className="mb-6">
            <h3 className="text-lg font-bold font-primary uppercase tracking-wide text-foreground mb-4">Payment Terms</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-primary uppercase tracking-wide text-muted-foreground mb-2">
                  Payment Terms *
                </label>
                <select
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData(prev => ({ ...prev, paymentTerms: e.target.value as any }))}
                  className="neomorphic-input w-full"
                  required
                >
                  <option value="due_on_receipt">Due on Receipt</option>
                  <option value="net15">Net 15 Days</option>
                  <option value="net30">Net 30 Days</option>
                  <option value="net45">Net 45 Days</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-primary uppercase tracking-wide text-muted-foreground mb-2">
                  Due Date *
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="neomorphic-input w-full"
                  required
                />
              </div>
            </div>
            <p className="text-sm font-primary text-muted-foreground mt-2">
              Selected terms: <strong className="text-foreground">{getPaymentTermsLabel(formData.paymentTerms)}</strong>
            </p>
          </div>

          {/* Totals Summary */}
          <div className="mb-6">
            <div className="neo-inset rounded-lg p-4">
              <h3 className="text-lg font-bold font-primary uppercase tracking-wide text-foreground mb-3">Invoice Summary</h3>
              <div className="space-y-2 font-primary">
                <div className="flex justify-between text-sm text-foreground">
                  <span>Subtotal:</span>
                  <span>${calculateSubtotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-foreground">
                  <span>Tax ({DEFAULT_TAX_CONFIG.name}):</span>
                  <span>{DEFAULT_TAX_CONFIG.rate === 0 ? 'N/A' : `$${calculateTax().toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-foreground border-t border-neomorphic-border pt-2">
                  <span>Total Amount Due:</span>
                  <span>${calculateTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-xs font-primary uppercase tracking-wide text-muted-foreground mb-2">
              Notes & Terms
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="neomorphic-input w-full resize-none"
              placeholder="Additional terms, conditions, or notes for this invoice..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-neomorphic-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="neo-button disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="neo-button-submit disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create & Send Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
    </>
  );
}
