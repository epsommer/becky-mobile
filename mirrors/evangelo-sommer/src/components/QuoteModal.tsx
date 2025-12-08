// src/components/QuoteModal.tsx
"use client";

import { useState, useEffect } from 'react';
import { Client } from '../types/client';
import { QuoteItem, DEFAULT_BUSINESS_CONFIG } from '../types/billing';
import { lockScroll, unlockScroll } from '../lib/modal-scroll-lock';
// Removed billingManager import - use API endpoints instead

interface QuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
  onQuoteCreated?: (quote: any) => void;
}

interface QuoteFormData {
  items: Omit<QuoteItem, 'id'>[];
  validUntil: Date;
  notes: string;
  terms: string;
  projectScope: string;
  estimatedDuration: string;
}

const ServiceTemplates = {
  landscaping: {
    commonItems: [
      { description: 'Lawn Mowing', unitPrice: 50, serviceCategory: 'landscaping' as const },
      { description: 'Garden Maintenance', unitPrice: 75, serviceCategory: 'landscaping' as const },
      { description: 'Tree Trimming', unitPrice: 100, serviceCategory: 'landscaping' as const },
      { description: 'Seasonal Cleanup', unitPrice: 200, serviceCategory: 'landscaping' as const }
    ]
  },
  snow_removal: {
    commonItems: [
      { description: 'Driveway Snow Removal', unitPrice: 40, serviceCategory: 'snow_removal' as const },
      { description: 'Walkway Clearing', unitPrice: 25, serviceCategory: 'snow_removal' as const },
      { description: 'Salt Application', unitPrice: 15, serviceCategory: 'snow_removal' as const }
    ]
  },
  hair_cutting: {
    commonItems: [
      { description: 'Haircut', unitPrice: 30, serviceCategory: 'hair_cutting' as const },
      { description: 'Wash & Style', unitPrice: 25, serviceCategory: 'hair_cutting' as const },
      { description: 'Color Treatment', unitPrice: 80, serviceCategory: 'hair_cutting' as const }
    ]
  },
  creative_development: {
    commonItems: [
      { description: 'UI/UX Design', unitPrice: 75, serviceCategory: 'creative_development' as const },
      { description: 'App Development', unitPrice: 100, serviceCategory: 'creative_development' as const },
      { description: '3D Graphics/Animation', unitPrice: 85, serviceCategory: 'creative_development' as const },
      { description: 'Network Administration', unitPrice: 90, serviceCategory: 'creative_development' as const }
    ]
  }
};

const createEmptyQuoteItem = (): Omit<QuoteItem, 'id'> => ({
  description: '',
  serviceCategory: 'landscaping',
  quantity: 1,
  unitPrice: 0,
  totalPrice: 0,
  estimatedHours: undefined,
  materialsIncluded: false,
  notes: ''
});

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const getDefaultQuoteTerms = (): string => {
  return `This quote is valid for 30 days from the date issued.
Pricing subject to change after expiration date.
Work will commence upon written acceptance of this quote.
Payment terms: Net 30 days from invoice date.`;
};

export default function QuoteModal({ isOpen, onClose, client, onQuoteCreated }: QuoteModalProps) {
  const [quoteData, setQuoteData] = useState<QuoteFormData>({
    items: [createEmptyQuoteItem()],
    validUntil: addDays(new Date(), 30), // 30-day validity
    notes: '',
    terms: getDefaultQuoteTerms(),
    projectScope: '',
    estimatedDuration: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Disable body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      lockScroll()
    } else {
      unlockScroll()
    }

    return () => {
      unlockScroll()
    }
  }, [isOpen])

  if (!isOpen) return null;

  const calculateSubtotal = (items: Omit<QuoteItem, 'id' | 'totalPrice'>[]): number => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const calculateTax = (items: Omit<QuoteItem, 'id' | 'totalPrice'>[]): number => {
    // For unregistered business, no tax
    if (!DEFAULT_BUSINESS_CONFIG.isRegistered) {
      return 0;
    }
    const subtotal = calculateSubtotal(items);
    return subtotal * 0.13; // Ontario HST
  };

  const calculateTotal = (items: Omit<QuoteItem, 'id' | 'totalPrice'>[]): number => {
    return calculateSubtotal(items) + calculateTax(items);
  };

  const handleItemChange = (index: number, field: keyof Omit<QuoteItem, 'id' | 'totalPrice'>, value: any) => {
    const newItems = [...quoteData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setQuoteData({ ...quoteData, items: newItems });
  };

  const addLineItem = () => {
    setQuoteData({
      ...quoteData,
      items: [...quoteData.items, createEmptyQuoteItem()]
    });
  };

  const removeLineItem = (index: number) => {
    if (quoteData.items.length > 1) {
      const newItems = quoteData.items.filter((_, i) => i !== index);
      setQuoteData({ ...quoteData, items: newItems });
    }
  };

  const addServiceTemplate = (template: { description: string; unitPrice: number; serviceCategory: string }) => {
    setQuoteData({
      ...quoteData,
      items: [...quoteData.items, {
        description: template.description,
        serviceCategory: template.serviceCategory as QuoteItem['serviceCategory'],
        unitPrice: template.unitPrice,
        quantity: 1,
        totalPrice: template.unitPrice,
        estimatedHours: undefined,
        materialsIncluded: false,
        notes: ''
      }]
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // TODO: Replace with API call to /api/billing/quotes
      console.log('Quote creation temporarily disabled - needs API endpoint');
      const quoteNumber = `Q-${Date.now()}`;
      const quote = {
        id: 'temp-' + Date.now(),
        quoteNumber,
        clientId: client.id,
        items: quoteData.items,
        validUntil: quoteData.validUntil,
        notes: quoteData.notes,
        terms: quoteData.terms
      };

      // Optionally send quote via email
      if (client.email) {
        // await sendQuoteByEmail(quote.id, client.email);
        console.log(`Quote ${quoteNumber} would be sent to ${client.email}`);
      }

      alert(`Quote ${quoteNumber} created successfully!`);
      onQuoteCreated?.(quote);
      onClose();
    } catch (error) {
      console.error('Failed to create quote:', error);
      alert('Failed to create quote. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const serviceTemplates = ServiceTemplates[client.serviceId as keyof typeof ServiceTemplates] || ServiceTemplates.landscaping;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-[100]" onClick={onClose} />

      {/* Modal container - accounts for sidebar on desktop */}
      <div className="fixed inset-y-0 right-0 left-0 lg:left-64 z-[101] flex items-start justify-center p-4 sm:p-6 md:p-8 overflow-y-auto pointer-events-none">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[calc(100vh-8rem)] sm:max-h-[calc(100vh-12rem)] md:max-h-[calc(100vh-16rem)] mt-16 sm:mt-20 md:mt-16 mb-8 overflow-y-auto pointer-events-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-tactical-grey-800">
            Create Quote - {client.name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-tactical-grey-500"
            disabled={isSubmitting}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Project Details Section */}
          <div className="project-section">
            <h3 className="text-lg font-medium text-tactical-grey-800 mb-4">Project Details</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
                  Project Scope
                </label>
                <textarea 
                  value={quoteData.projectScope}
                  onChange={(e) => setQuoteData({...quoteData, projectScope: e.target.value})}
                  placeholder="Describe the project scope and requirements..."
                  rows={3}
                  className="w-full px-3 py-2 border border-tactical-grey-400 rounded-lg focus:ring-2 focus:ring-tactical-gold-500 focus:border-tactical-gold-500"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
                    Estimated Duration
                  </label>
                  <input 
                    type="text"
                    value={quoteData.estimatedDuration}
                    onChange={(e) => setQuoteData({...quoteData, estimatedDuration: e.target.value})}
                    placeholder="e.g., 2-3 weeks, 1 month"
                    className="w-full px-3 py-2 border border-tactical-grey-400 rounded-lg focus:ring-2 focus:ring-tactical-gold-500 focus:border-tactical-gold-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
                    Valid Until *
                  </label>
                  <input 
                    type="date"
                    value={quoteData.validUntil.toISOString().split('T')[0]}
                    onChange={(e) => setQuoteData({...quoteData, validUntil: new Date(e.target.value)})}
                    required
                    className="w-full px-3 py-2 border border-tactical-grey-400 rounded-lg focus:ring-2 focus:ring-tactical-gold-500 focus:border-tactical-gold-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Services & Pricing Section */}
          <div className="items-section">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-tactical-grey-800">Services & Pricing</h3>
              <div className="flex space-x-2">
                {serviceTemplates.commonItems.map((template, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => addServiceTemplate(template)}
                    className="px-3 py-1 text-xs bg-tactical-gold-muted text-tactical-brown-dark rounded hover:bg-tactical-gold-light"
                  >
                    + {template.description}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {quoteData.items.map((item, index) => (
                <div key={index} className="border border-tactical-grey-300 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
                        Description *
                      </label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        placeholder="Service description"
                        required
                        className="w-full px-3 py-2 border border-tactical-grey-400 rounded-lg focus:ring-2 focus:ring-tactical-gold-500 focus:border-tactical-gold-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 1)}
                        required
                        className="w-full px-3 py-2 border border-tactical-grey-400 rounded-lg focus:ring-2 focus:ring-tactical-gold-500 focus:border-tactical-gold-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
                        Unit Price *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        required
                        className="w-full px-3 py-2 border border-tactical-grey-400 rounded-lg focus:ring-2 focus:ring-tactical-gold-500 focus:border-tactical-gold-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
                        Estimated Hours
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={item.estimatedHours || ''}
                        onChange={(e) => handleItemChange(index, 'estimatedHours', e.target.value ? parseFloat(e.target.value) : undefined)}
                        placeholder="Optional"
                        className="w-full px-3 py-2 border border-tactical-grey-400 rounded-lg focus:ring-2 focus:ring-tactical-gold-500 focus:border-tactical-gold-500"
                      />
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id={`materials-${index}`}
                        checked={item.materialsIncluded}
                        onChange={(e) => handleItemChange(index, 'materialsIncluded', e.target.checked)}
                        className="rounded border-tactical-grey-400 text-tactical-gold focus:ring-tactical-gold-500"
                      />
                      <label htmlFor={`materials-${index}`} className="ml-2 text-sm text-tactical-grey-600">
                        Materials Included
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-tactical-grey-800">
                        Total: ${(item.quantity * item.unitPrice).toFixed(2)} CAD
                      </span>
                      {quoteData.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLineItem(index)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  {item.notes !== undefined && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
                        Item Notes
                      </label>
                      <input
                        type="text"
                        value={item.notes}
                        onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
                        placeholder="Additional notes for this item"
                        className="w-full px-3 py-2 border border-tactical-grey-400 rounded-lg focus:ring-2 focus:ring-tactical-gold-500 focus:border-tactical-gold-500"
                      />
                    </div>
                  )}
                </div>
              ))}

              <button 
                type="button" 
                onClick={addLineItem}
                className="w-full py-2 border-2 border-dashed border-tactical-grey-400 rounded-lg text-tactical-grey-500 hover:border-tactical-grey-400 hover:text-tactical-gold"
              >
                + Add Service
              </button>
            </div>
          </div>

          {/* Totals Summary */}
          <div className="totals-section bg-tactical-grey-100 rounded-lg p-4">
            <h4 className="text-lg font-medium text-tactical-grey-800 mb-3">Quote Summary</h4>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${calculateSubtotal(quoteData.items).toFixed(2)} CAD</span>
              </div>
              
              <div className="flex justify-between">
                <span>HST/GST:</span>
                <span>
                  {DEFAULT_BUSINESS_CONFIG.isRegistered 
                    ? `$${calculateTax(quoteData.items).toFixed(2)} CAD`
                    : 'Not Applicable'
                  }
                </span>
              </div>
              
              <div className="flex justify-between text-lg font-semibold border-t pt-2">
                <span>Total Quote:</span>
                <span>${calculateTotal(quoteData.items).toFixed(2)} CAD</span>
              </div>
            </div>
            
            {!DEFAULT_BUSINESS_CONFIG.isRegistered && (
              <div className="mt-3 text-xs text-tactical-grey-500">
                * No HST/GST applicable - Small business exemption
              </div>
            )}
          </div>

          {/* Terms & Notes */}
          <div className="terms-section space-y-4">
            <div>
              <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
                Terms & Conditions
              </label>
              <textarea 
                value={quoteData.terms}
                onChange={(e) => setQuoteData({...quoteData, terms: e.target.value})}
                rows={4}
                className="w-full px-3 py-2 border border-tactical-grey-400 rounded-lg focus:ring-2 focus:ring-tactical-gold-500 focus:border-tactical-gold-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
                Additional Notes
              </label>
              <textarea 
                value={quoteData.notes}
                onChange={(e) => setQuoteData({...quoteData, notes: e.target.value})}
                placeholder="Any additional information for the client..."
                rows={3}
                className="w-full px-3 py-2 border border-tactical-grey-400 rounded-lg focus:ring-2 focus:ring-tactical-gold-500 focus:border-tactical-gold-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button 
              type="button" 
              onClick={onClose} 
              disabled={isSubmitting}
              className="px-4 py-2 text-tactical-grey-600 bg-tactical-grey-200 rounded-lg hover:bg-tactical-grey-300 disabled:opacity-50"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="px-4 py-2 bg-tactical-gold text-white rounded-lg hover:bg-tactical-gold-dark disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create & Send Quote'}
            </button>
          </div>
        </form>
      </div>
    </div>
    </>
  );
}
