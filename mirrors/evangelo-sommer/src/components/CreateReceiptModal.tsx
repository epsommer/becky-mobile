"use client";

import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { Button } from './ui/button';

interface CreateReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReceiptCreated?: (receipt: any) => void;
  editMode?: boolean;
  existingReceiptId?: string;
}

interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

interface ReceiptItem {
  description: string;
  serviceType: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxable: boolean;
}

interface ReceiptFormData {
  clientId: string;
  items: ReceiptItem[];
  paymentMethod: 'cash' | 'credit' | 'debit' | 'e-transfer' | 'cheque';
  serviceDate: string;
  notes: string;
  paymentStatus: 'paid' | 'unpaid';
}

const SERVICE_TYPES = [
  { value: 'landscaping', label: 'Landscaping', company: 'Woodgreen Landscaping' },
  { value: 'lawn_care', label: 'Lawn Care', company: 'Woodgreen Landscaping' },
  { value: 'maintenance', label: 'Property Maintenance', company: 'Woodgreen Landscaping' },
  { value: 'snow_removal', label: 'Snow Removal', company: 'White Knight Snow Service' },
  { value: 'hair_cutting', label: 'Pet Grooming', company: 'Pupawalk Pet Services' },
  { value: 'creative_development', label: 'Creative Development', company: 'Evangelo Sommer' },
  { value: 'consultation', label: 'Consultation', company: 'Evangelo Sommer' },
  { value: 'design', label: 'Design Services', company: 'Evangelo Sommer' },
  { value: 'installation', label: 'Installation Services', company: 'Evangelo Sommer' },
  { value: 'emergency', label: 'Emergency Services', company: 'Evangelo Sommer' }
];

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'credit', label: 'Credit Card' },
  { value: 'debit', label: 'Debit Card' },
  { value: 'e-transfer', label: 'E-Transfer' },
  { value: 'cheque', label: 'Cheque' }
];

export default function CreateReceiptModal({ isOpen, onClose, onReceiptCreated, editMode = false, existingReceiptId }: CreateReceiptModalProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<ReceiptFormData>({
    clientId: '',
    items: [{
      description: '',
      serviceType: 'landscaping',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      taxable: false
    }],
    paymentMethod: 'cash',
    serviceDate: new Date().toISOString().split('T')[0],
    notes: '',
    paymentStatus: 'unpaid'
  });

  useEffect(() => {
    if (isOpen) {
      loadClients();
      if (editMode && existingReceiptId) {
        loadExistingReceipt();
      }
    }
  }, [isOpen, editMode, existingReceiptId]);

  const loadExistingReceipt = async () => {
    if (!existingReceiptId) return;
    
    try {
      const response = await fetch(`/api/billing/receipts/${existingReceiptId}`);
      if (response.ok) {
        const data = await response.json();
        const existingReceipt = data.receipt;
        
        if (existingReceipt) {
          // Populate form with existing data
          setFormData({
            clientId: existingReceipt.clientId,
            items: existingReceipt.items && existingReceipt.items.length > 0 ? existingReceipt.items.map((item: any) => ({
              description: item.description || '',
              serviceType: item.serviceType || 'landscaping',
              quantity: item.quantity || 1,
              unitPrice: item.unitPrice || 0,
              totalPrice: item.totalPrice || 0,
              taxable: item.taxable || false
            })) : [{
              description: '',
              serviceType: 'landscaping',
              quantity: 1,
              unitPrice: 0,
              totalPrice: 0,
              taxable: false
            }],
            paymentMethod: existingReceipt.paymentMethod || 'cash',
            serviceDate: existingReceipt.serviceDate ? new Date(existingReceipt.serviceDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            notes: existingReceipt.notes || '',
            paymentStatus: existingReceipt.status === 'paid' ? 'paid' : 'unpaid'
          });
        }
      } else {
        console.error('Failed to fetch receipt:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to load existing receipt:', error);
    }
  };

  const loadClients = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/clients');
      if (response.ok) {
        const clientsData = await response.json();
        // Ensure clientsData is an array
        if (Array.isArray(clientsData)) {
          setClients(clientsData);
        } else if (clientsData && Array.isArray(clientsData.data)) {
          // Handle case where API returns { data: [...] }
          setClients(clientsData.data);
        } else if (clientsData && Array.isArray(clientsData.clients)) {
          // Handle case where API returns { clients: [...] }
          setClients(clientsData.clients);
        } else {
          console.error('Invalid clients data format:', clientsData);
          setClients([]);
        }
      } else {
        console.error('Failed to fetch clients:', response.status, response.statusText);
        setClients([]);
      }
    } catch (error) {
      console.error('Failed to load clients:', error);
      setClients([]);
    }
    setIsLoading(false);
  };

  const updateItemPrice = (index: number, field: keyof ReceiptItem, value: any) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    if (field === 'quantity' || field === 'unitPrice') {
      updatedItems[index].totalPrice = updatedItems[index].quantity * updatedItems[index].unitPrice;
    }
    
    setFormData({ ...formData, items: updatedItems });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, {
        description: '',
        serviceType: 'landscaping',
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
        taxable: false
      }]
    });
  };

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      const updatedItems = formData.items.filter((_, i) => i !== index);
      setFormData({ ...formData, items: updatedItems });
    }
  };

  const calculateTotal = () => {
    return formData.items.reduce((total, item) => total + item.totalPrice, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.clientId) {
      alert('Please select a client');
      return;
    }

    if (formData.items.some(item => !item.description || item.unitPrice <= 0)) {
      alert('Please fill in all item details');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const receiptData = {
        clientId: formData.clientId,
        items: formData.items,
        paymentMethod: formData.paymentMethod,
        paymentDate: new Date().toISOString(),
        serviceDate: new Date(formData.serviceDate).toISOString(),
        status: formData.paymentStatus === 'paid' ? 'paid' : 'draft',
        notes: formData.notes
      };

      const url = editMode && existingReceiptId ? `/api/billing/receipts/${existingReceiptId}` : '/api/billing/receipts';
      const method = editMode ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(receiptData),
      });

      if (response.ok) {
        const newReceipt = await response.json();
        onReceiptCreated?.(newReceipt);
        onClose();
        // Reset form
        setFormData({
          clientId: '',
          items: [{
            description: '',
            serviceType: 'landscaping',
            quantity: 1,
            unitPrice: 0,
            totalPrice: 0,
            taxable: false
          }],
          paymentMethod: 'cash',
          serviceDate: new Date().toISOString().split('T')[0],
          notes: '',
          paymentStatus: 'unpaid'
        });
      } else {
        let errorMessage = 'Unknown error';
        try {
          const error = await response.json();
          errorMessage = error.message || error.error || `Server error: ${response.status} ${response.statusText}`;
        } catch (e) {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        console.error('Receipt creation failed:', errorMessage);
        alert(`Failed to create receipt: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error creating receipt:', error);
      alert('Failed to create receipt. Please try again.');
    }
    
    setIsSubmitting(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white border-2 border-hud-border-accent max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-hud-border bg-hud-background-secondary">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-hud-text-primary font-primary uppercase tracking-wide">
              {editMode ? 'Edit Receipt' : 'Create New Receipt'}
            </h2>
            <button
              onClick={onClose}
              className="text-medium-grey hover:text-hud-text-primary transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Client Selection */}
            <div>
              <label className="block text-sm font-bold text-hud-text-primary font-primary uppercase tracking-wide mb-2">
                Client *
              </label>
              <select
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                className="w-full px-3 py-2 border-2 border-hud-border focus:border-hud-border-accent focus:ring-1 focus:ring-gold font-primary"
                required
              >
                <option value="">Select a client</option>
                {Array.isArray(clients) && clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.name} {client.email ? `(${client.email})` : ''}
                  </option>
                ))}
              </select>
              {isLoading && (
                <p className="text-sm text-medium-grey mt-1">Loading clients...</p>
              )}
              {!isLoading && (!Array.isArray(clients) || clients.length === 0) && (
                <p className="text-sm text-red-600 mt-1">No clients available. Please create a client first.</p>
              )}
            </div>

            {/* Payment Status */}
            <div>
              <label className="block text-sm font-bold text-hud-text-primary font-primary uppercase tracking-wide mb-2">
                Payment Status *
              </label>
              <select
                value={formData.paymentStatus}
                onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value as 'paid' | 'unpaid' })}
                className="w-full px-3 py-2 border-2 border-hud-border focus:border-hud-border-accent focus:ring-1 focus:ring-gold font-primary"
                required
              >
                <option value="unpaid">Unpaid</option>
                <option value="paid">Paid</option>
              </select>
            </div>

            {/* Service Date */}
            <div>
              <label className="block text-sm font-bold text-hud-text-primary font-primary uppercase tracking-wide mb-2">
                Service Date *
              </label>
              <input
                type="date"
                value={formData.serviceDate}
                onChange={(e) => setFormData({ ...formData, serviceDate: e.target.value })}
                className="w-full px-3 py-2 border-2 border-hud-border focus:border-hud-border-accent focus:ring-1 focus:ring-gold font-primary"
                required
              />
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-bold text-hud-text-primary font-primary uppercase tracking-wide">
                  Items/Services *
                </label>
                <Button
                  type="button"
                  onClick={addItem}
                  size="sm"
                  variant="outline"
                  className="text-gold border-hud-border-accent hover:bg-tactical-gold hover:text-hud-text-primary"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Item
                </Button>
              </div>

              <div className="space-y-4">
                {formData.items.map((item, index) => (
                  <div key={index} className="p-4 border-2 border-hud-border bg-hud-background-secondary">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                      <div className="lg:col-span-2">
                        <label className="block text-xs font-bold text-hud-text-primary font-primary uppercase mb-1">
                          Description
                        </label>
                        <input
                          type="text"
                          placeholder="Service description"
                          value={item.description}
                          onChange={(e) => updateItemPrice(index, 'description', e.target.value)}
                          className="w-full px-2 py-2 border border-hud-border focus:border-hud-border-accent focus:ring-1 focus:ring-gold font-primary text-sm"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-hud-text-primary font-primary uppercase mb-1">
                          Service Type
                        </label>
                        <select
                          value={item.serviceType}
                          onChange={(e) => updateItemPrice(index, 'serviceType', e.target.value)}
                          className="w-full px-2 py-2 border border-hud-border focus:border-hud-border-accent focus:ring-1 focus:ring-gold font-primary text-sm"
                        >
                          {SERVICE_TYPES.map(service => (
                            <option key={service.value} value={service.value}>
                              {service.label}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-medium-grey mt-1">
                          {SERVICE_TYPES.find(s => s.value === item.serviceType)?.company}
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-hud-text-primary font-primary uppercase mb-1">
                          Quantity
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItemPrice(index, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-full px-2 py-2 border border-hud-border focus:border-hud-border-accent focus:ring-1 focus:ring-gold font-primary text-sm"
                        />
                      </div>

                      <div className="flex items-end space-x-2">
                        <div className="flex-1">
                          <label className="block text-xs font-bold text-hud-text-primary font-primary uppercase mb-1">
                            Unit Price ($)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => updateItemPrice(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-2 border border-hud-border focus:border-hud-border-accent focus:ring-1 focus:ring-gold font-primary text-sm"
                            required
                          />
                        </div>
                        {formData.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="p-2 text-red-600 hover:text-red-800 transition-colors"
                            title="Remove item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 text-sm font-primary">
                      <span className="font-bold">Total: ${item.totalPrice.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-bold text-hud-text-primary font-primary uppercase tracking-wide mb-2">
                Payment Method *
              </label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
                className="w-full px-3 py-2 border-2 border-hud-border focus:border-hud-border-accent focus:ring-1 focus:ring-gold font-primary"
                required
              >
                {PAYMENT_METHODS.map(method => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-bold text-hud-text-primary font-primary uppercase tracking-wide mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border-2 border-hud-border focus:border-hud-border-accent focus:ring-1 focus:ring-gold font-primary"
                placeholder="Additional notes or comments..."
              />
            </div>

            {/* Total Summary */}
            <div className="border-t-2 border-hud-border-accent pt-4">
              <div className="flex justify-between items-center text-lg font-bold font-primary">
                <span className="text-hud-text-primary uppercase tracking-wide">Total Amount:</span>
                <span className="text-gold">${calculateTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-hud-border">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || calculateTotal() <= 0}
              className="bg-tactical-gold hover:bg-tactical-gold-dark text-hud-text-primary"
            >
              {isSubmitting ? (editMode ? 'Updating...' : 'Creating...') : (editMode ? 'Update Receipt' : 'Create Receipt')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}