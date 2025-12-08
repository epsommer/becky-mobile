"use client";

import { useState, useEffect } from "react";
import { Receipt, ReceiptItem, CreateReceiptData, DEFAULT_TAX_CONFIG } from "../types/billing";
import { Client, Conversation, Message } from "../types/client";
import { billingManager } from "../lib/billing-manager";
import { X, Sparkles, AlertCircle } from "lucide-react";

interface EnhancedReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
  conversation?: Conversation;
  autoFillData?: {
    serviceType: string;
    suggestedAmount: number;
    confidence: 'high' | 'medium' | 'low';
    reason: string;
  };
  onReceiptCreated?: (receipt: Receipt) => void;
}

interface ReceiptFormData {
  items: ReceiptItem[];
  paymentMethod: 'cash' | 'card' | 'e-transfer' | 'check' | 'other';
  paymentDate: string;
  serviceDate: string;
  notes: string;
}

const ServiceTemplates = {
  lawnService: [
    { description: 'Lawn Maintenance Service', unitPrice: 50, serviceType: 'landscaping' as const },
    { description: 'Grass Cutting', unitPrice: 45, serviceType: 'landscaping' as const },
    { description: 'Lawn Mowing', unitPrice: 50, serviceType: 'landscaping' as const },
  ],
  snowRemoval: [
    { description: 'Snow Removal Service', unitPrice: 75, serviceType: 'snow_removal' as const },
    { description: 'Driveway Snow Clearing', unitPrice: 60, serviceType: 'snow_removal' as const },
    { description: 'Salt Application', unitPrice: 25, serviceType: 'snow_removal' as const }
  ],
  landscaping: [
    { description: 'Landscaping Service', unitPrice: 100, serviceType: 'landscaping' as const },
    { description: 'Garden Maintenance', unitPrice: 75, serviceType: 'landscaping' as const },
    { description: 'Yard Work', unitPrice: 80, serviceType: 'landscaping' as const }
  ]
};

function createEmptyLineItem(): ReceiptItem {
  return {
    id: Math.random().toString(36).substr(2, 9),
    description: "",
    serviceType: 'consultation',
    quantity: 1,
    unitPrice: 0,
    totalPrice: 0,
    taxable: true
  };
}

export default function EnhancedReceiptModal({ 
  isOpen, 
  onClose, 
  client, 
  conversation,
  autoFillData,
  onReceiptCreated 
}: EnhancedReceiptModalProps) {
  const [formData, setFormData] = useState<ReceiptFormData>({
    items: [createEmptyLineItem()],
    paymentMethod: 'cash',
    paymentDate: new Date().toISOString().split('T')[0],
    serviceDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAutoFilled, setIsAutoFilled] = useState(false);

  // Disable body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Auto-fill form when autoFillData is provided
  useEffect(() => {
    if (autoFillData && isOpen) {
      const serviceTemplate = getServiceTemplate(autoFillData.serviceType);
      const autoFilledItem: ReceiptItem = {
        id: Math.random().toString(36).substr(2, 9),
        description: serviceTemplate?.description || `${autoFillData.serviceType.replace(/([A-Z])/g, ' $1')} Service`,
        serviceType: (autoFillData.serviceType as ReceiptItem['serviceType']) || 'consultation',
        quantity: 1,
        unitPrice: autoFillData.suggestedAmount,
        totalPrice: autoFillData.suggestedAmount,
        taxable: true
      };

      // Extract payment method from conversation if available
      const extractedPaymentMethod = extractPaymentMethodFromConversation(conversation);
      
      // Generate contextual notes from conversation
      const contextualNotes = generateContextualNotes(conversation, autoFillData);

      setFormData(prev => ({
        ...prev,
        items: [autoFilledItem],
        paymentMethod: extractedPaymentMethod || 'cash',
        notes: contextualNotes
      }));
      
      setIsAutoFilled(true);
    }
  }, [autoFillData, isOpen, conversation]);

  const getServiceTemplate = (serviceType: string) => {
    const templates = ServiceTemplates[serviceType as keyof typeof ServiceTemplates];
    return templates?.[0];
  };

  const extractPaymentMethodFromConversation = (conv?: Conversation): 'cash' | 'card' | 'e-transfer' | 'check' | 'other' | null => {
    if (!conv) return null;
    
    const lastMessages = conv.messages.slice(-3);
    const content = lastMessages.map(m => m.content.toLowerCase()).join(' ');
    
    if (content.includes('e-transfer') || content.includes('etransfer') || content.includes('interac')) {
      return 'e-transfer';
    }
    if (content.includes('cash')) {
      return 'cash';
    }
    if (content.includes('card') || content.includes('visa') || content.includes('mastercard')) {
      return 'card';
    }
    if (content.includes('check') || content.includes('cheque')) {
      return 'check';
    }
    
    return null;
  };

  const generateContextualNotes = (conv?: Conversation, autoData?: typeof autoFillData): string => {
    if (!conv || !autoData) return '';
    
    const notes = [];
    
    // Add auto-generated indicator
    notes.push(`Auto-generated from conversation (${autoData.confidence} confidence)`);
    
    // Add reason for auto-generation
    if (autoData.reason) {
      notes.push(`Detection: ${autoData.reason}`);
    }
    
    // Add conversation reference
    notes.push(`Reference: Conversation ${conv.id.slice(-8)}`);
    
    return notes.join(' • ');
  };

  const updateItem = (index: number, field: keyof ReceiptItem, value: any) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      newItems[index] = {
        ...newItems[index],
        [field]: value,
        totalPrice: field === 'quantity' || field === 'unitPrice' 
          ? (field === 'quantity' ? value : newItems[index].quantity) * (field === 'unitPrice' ? value : newItems[index].unitPrice)
          : newItems[index].totalPrice
      };
      return { ...prev, items: newItems };
    });
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, createEmptyLineItem()]
    }));
  };

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }));
    }
  };

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * DEFAULT_TAX_CONFIG.rate;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      const receiptData: CreateReceiptData = {
        clientId: client.id,
        conversationId: conversation?.id,
        items: formData.items.map(item => ({
          description: item.description,
          serviceType: item.serviceType,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          taxable: item.taxable
        })),
        paymentMethod: formData.paymentMethod,
        paymentDate: new Date(formData.paymentDate),
        serviceDate: new Date(formData.serviceDate),
        notes: formData.notes
      };

      const receipt = await billingManager.createReceipt(receiptData);
      
      if (onReceiptCreated) {
        onReceiptCreated(receipt);
      }
      
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create receipt');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="neo-card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neomorphic-border">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold font-primary uppercase tracking-wide text-foreground">
              Create Receipt
            </h2>
            {isAutoFilled && (
              <div className="flex items-center gap-2 px-3 py-1 neo-button-active">
                <Sparkles className="w-4 h-4 text-tactical-gold" />
                <span className="text-xs font-primary font-bold uppercase tracking-wide text-foreground">
                  Auto-Drafted
                </span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="neo-icon-button"
            aria-label="Close receipt modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auto-fill banner */}
        {isAutoFilled && autoFillData && (
          <div className="p-3 neo-inset border-b border-neomorphic-border">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-tactical-gold mt-0.5" />
              <div className="text-sm font-primary text-foreground">
                <div className="font-bold">AI Context Applied</div>
                <div className="text-xs mt-1 text-muted-foreground">
                  Service: {autoFillData.serviceType.replace(/([A-Z])/g, ' $1')} •
                  Amount: ${autoFillData.suggestedAmount} •
                  Confidence: {autoFillData.confidence}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form Content */}
        <div className="p-6 space-y-6">
          {/* Client Info */}
          <div className="p-4 neo-inset rounded-lg">
            <h3 className="font-primary font-bold uppercase tracking-wide text-foreground mb-2">
              Client Information
            </h3>
            <div className="text-sm font-primary text-foreground">
              <div><strong>Name:</strong> {client.name}</div>
              <div><strong>Email:</strong> {client.email || 'N/A'}</div>
              <div><strong>Service:</strong> {client.serviceId}</div>
            </div>
          </div>

          {/* Line Items */}
          <div>
            <h3 className="font-primary font-bold uppercase tracking-wide text-foreground mb-4">
              Services & Items
            </h3>
            <div className="space-y-3">
              {formData.items.map((item, index) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    <label className="block text-xs font-primary uppercase tracking-wide text-muted-foreground mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      className="neomorphic-input w-full"
                      placeholder="Service description"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-primary uppercase tracking-wide text-muted-foreground mb-1">
                      Qty
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                      className="neomorphic-input w-full"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-primary uppercase tracking-wide text-muted-foreground mb-1">
                      Price
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                      className="neomorphic-input w-full"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-primary uppercase tracking-wide text-muted-foreground mb-1">
                      Total
                    </label>
                    <div className="p-2 neo-inset rounded font-primary text-foreground font-bold text-center">
                      ${item.totalPrice.toFixed(2)}
                    </div>
                  </div>
                  <div className="col-span-1">
                    {formData.items.length > 1 && (
                      <button
                        onClick={() => removeItem(index)}
                        className="neo-icon-button w-full"
                        aria-label="Remove item"
                      >
                        <X className="w-4 h-4 mx-auto text-red-500" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={addItem}
              className="neo-button mt-4"
            >
              + Add Item
            </button>
          </div>

          {/* Payment Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-primary uppercase tracking-wide text-muted-foreground mb-2">
                Payment Method
              </label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value as any }))}
                className="neomorphic-input w-full"
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="e-transfer">E-Transfer</option>
                <option value="check">Check</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-primary uppercase tracking-wide text-muted-foreground mb-2">
                Payment Date
              </label>
              <input
                type="date"
                value={formData.paymentDate}
                onChange={(e) => setFormData(prev => ({ ...prev, paymentDate: e.target.value }))}
                className="neomorphic-input w-full"
              />
            </div>
          </div>

          {/* Service Date */}
          <div>
            <label className="block text-xs font-primary uppercase tracking-wide text-muted-foreground mb-2">
              Service Date
            </label>
            <input
              type="date"
              value={formData.serviceDate}
              onChange={(e) => setFormData(prev => ({ ...prev, serviceDate: e.target.value }))}
              className="neomorphic-input w-full"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-primary uppercase tracking-wide text-muted-foreground mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="neomorphic-input w-full resize-none"
              placeholder="Additional notes..."
            />
          </div>

          {/* Total Summary */}
          <div className="p-4 neo-inset rounded-lg">
            <div className="space-y-2 font-primary">
              <div className="flex justify-between text-foreground">
                <span>Subtotal:</span>
                <span>${calculateSubtotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-foreground">
                <span>Tax ({DEFAULT_TAX_CONFIG.rate > 0 ? `${(DEFAULT_TAX_CONFIG.rate * 100).toFixed(1)}%` : DEFAULT_TAX_CONFIG.name}):</span>
                <span>{DEFAULT_TAX_CONFIG.rate > 0 ? `$${calculateTax().toFixed(2)}` : 'N/A'}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-foreground border-t border-neomorphic-border pt-2">
                <span>Total:</span>
                <span>${calculateTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 neo-inset rounded-lg border-2 border-red-500 text-red-700 font-primary text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-neomorphic-border">
            <button
              onClick={onClose}
              className="neo-button"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="neo-button-submit disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Receipt'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}