// src/components/ConversationBillingPanel.tsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Conversation, Client } from '../types/client';
import { Receipt, Invoice, BillingSuggestion, CreateReceiptData, CreateInvoiceData } from '../types/billing';
// Removed billingManager import - use API endpoints instead
import PDFGenerator from '../lib/pdf-generator';

interface ConversationBillingPanelProps {
  conversation: Conversation;
  client: Client;
  className?: string;
}

export default function ConversationBillingPanel({ 
  conversation, 
  client, 
  className = "" 
}: ConversationBillingPanelProps) {
  const [billingSuggestion, setBillingSuggestion] = useState<BillingSuggestion | null>(null);
  const [existingReceipts, setExistingReceipts] = useState<Receipt[]>([]);
  const [existingInvoices, setExistingInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showReceiptForm, setShowReceiptForm] = useState(false);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [receiptFormData, setReceiptFormData] = useState<Partial<CreateReceiptData>>({
    clientId: client.id,
    conversationId: conversation.id,
    paymentMethod: 'cash',
    items: []
  });
  const [invoiceFormData, setInvoiceFormData] = useState<Partial<CreateInvoiceData>>({
    clientId: client.id,
    conversationId: conversation.id,
    paymentTerms: 'net30',
    items: []
  });

  const loadExistingBillingDocuments = useCallback(() => {
    // TODO: Use API endpoints instead
    const receipts: Receipt[] = [];
    const invoices: Invoice[] = [];
    
    setExistingReceipts(receipts);
    setExistingInvoices(invoices);
  }, [conversation.id]);

  useEffect(() => {
    // Analyze conversation for billing opportunities
    // TODO: Move to API endpoint
    const suggestion: BillingSuggestion = {
      type: 'none',
      confidence: 'low',
      serviceType: undefined,
      suggestedAmount: undefined,
      reason: 'Billing analysis temporarily disabled'
    };
    setBillingSuggestion(suggestion);
    
    // Load existing billing documents for this conversation
    loadExistingBillingDocuments();
  }, [conversation, loadExistingBillingDocuments]);

  const generateReceiptFromConversation = async () => {
    if (!billingSuggestion || billingSuggestion.type !== 'receipt') return;
    
    const suggestedItems = billingSuggestion.suggestedItems || [];
    const amount = billingSuggestion.suggestedAmount || 100; // Default amount
    
    // Pre-fill form with suggested data
    const items = suggestedItems.length > 0 ? suggestedItems.map(item => {
      const unitPrice = amount / suggestedItems.length;
      return {
        description: item.description,
        serviceType: item.serviceType,
        quantity: item.quantity,
        unitPrice: unitPrice,
        totalPrice: item.quantity * unitPrice,
        taxable: item.taxable
      };
    }) : [{
      description: 'Service from conversation',
      serviceType: 'consultation' as const,
      quantity: 1,
      unitPrice: amount,
      totalPrice: amount,
      taxable: true
    }];

    setReceiptFormData({
      ...receiptFormData,
      items: items
    });
    setShowReceiptForm(true);
  };

  const generateInvoiceFromConversation = async () => {
    if (!billingSuggestion || billingSuggestion.type !== 'invoice') return;
    
    const suggestedItems = billingSuggestion.suggestedItems || [];
    const amount = billingSuggestion.suggestedAmount || 100; // Default amount
    
    // Pre-fill form with suggested data
    const items = suggestedItems.length > 0 ? suggestedItems.map(item => {
      const unitPrice = amount / suggestedItems.length;
      return {
        description: item.description,
        serviceType: item.serviceType,
        quantity: item.quantity,
        unitPrice: unitPrice,
        totalPrice: item.quantity * unitPrice,
        taxable: item.taxable
      };
    }) : [{
      description: 'Service from conversation',
      serviceType: 'consultation' as const,
      quantity: 1,
      unitPrice: amount,
      totalPrice: amount,
      taxable: true
    }];

    setInvoiceFormData({
      ...invoiceFormData,
      items: items
    });
    setShowInvoiceForm(true);
  };

  const handleCreateReceipt = async () => {
    if (!receiptFormData.items || receiptFormData.items.length === 0) {
      alert('Please add at least one item');
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Replace with API call to /api/billing/receipts
      console.log('Receipt creation temporarily disabled');
      const receipt = { id: 'temp-' + Date.now(), ...receiptFormData };
      console.log('Receipt created:', receipt);
      
      // Refresh the existing documents
      loadExistingBillingDocuments();
      setShowReceiptForm(false);
      setReceiptFormData({
        clientId: client.id,
        conversationId: conversation.id,
        paymentMethod: 'cash',
        items: []
      });
    } catch (error) {
      console.error('Error creating receipt:', error);
      alert('Failed to create receipt: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateInvoice = async () => {
    if (!invoiceFormData.items || invoiceFormData.items.length === 0) {
      alert('Please add at least one item');
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Replace with API call to /api/billing/invoices
      console.log('Invoice creation temporarily disabled');
      const invoice = { id: 'temp-' + Date.now(), ...invoiceFormData };
      console.log('Invoice created:', invoice);

      // Refresh the existing documents
      loadExistingBillingDocuments();
      setShowInvoiceForm(false);
      setInvoiceFormData({
        clientId: client.id,
        conversationId: conversation.id,
        paymentTerms: 'net30',
        items: []
      });
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('Failed to create invoice: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const addReceiptItem = () => {
    const newItem = {
      description: '',
      serviceType: 'consultation' as const,
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      taxable: true
    };
    
    setReceiptFormData({
      ...receiptFormData,
      items: [...(receiptFormData.items || []), newItem]
    });
  };

  const addInvoiceItem = () => {
    const newItem = {
      description: '',
      serviceType: 'consultation' as const,
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      taxable: true
    };
    
    setInvoiceFormData({
      ...invoiceFormData,
      items: [...(invoiceFormData.items || []), newItem]
    });
  };

  const updateReceiptItem = (index: number, field: string, value: string | number | boolean) => {
    const updatedItems = [...(receiptFormData.items || [])];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setReceiptFormData({ ...receiptFormData, items: updatedItems });
  };

  const updateInvoiceItem = (index: number, field: string, value: string | number | boolean) => {
    const updatedItems = [...(invoiceFormData.items || [])];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setInvoiceFormData({ ...invoiceFormData, items: updatedItems });
  };

  const removeReceiptItem = (index: number) => {
    const updatedItems = (receiptFormData.items || []).filter((_, i) => i !== index);
    setReceiptFormData({ ...receiptFormData, items: updatedItems });
  };

  const removeInvoiceItem = (index: number) => {
    const updatedItems = (invoiceFormData.items || []).filter((_, i) => i !== index);
    setInvoiceFormData({ ...invoiceFormData, items: updatedItems });
  };

  const viewReceipt = async (receiptId: string) => {
    // TODO: Replace with API call to /api/billing/receipts/:id
    console.log('Receipt viewing temporarily disabled');
    alert('Receipt viewing is temporarily disabled. Please use the API endpoint.');
    return;
  };

  const viewInvoice = async (invoiceId: string) => {
    // TODO: Replace with API call to /api/billing/invoices/:id
    console.log('Invoice viewing temporarily disabled');
    alert('Invoice viewing is temporarily disabled. Please use the API endpoint.');
    return;
  };

  return (
    <div className={`bg-white rounded-lg shadow border p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-tactical-grey-800 mb-4 flex items-center">
        <span className="mr-2">💰</span>
        Billing & Receipts
      </h3>

      {/* Existing Documents */}
      {(existingReceipts.length > 0 || existingInvoices.length > 0) && (
        <div className="mb-6">
          {/* Existing Receipts */}
          {existingReceipts.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-tactical-grey-600 mb-2">Receipts</h4>
              <div className="space-y-2">
                {existingReceipts.map(receipt => (
                  <div key={receipt.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div>
                      <span className="font-medium text-green-900">{receipt.receiptNumber}</span>
                      <span className="text-green-700 ml-2">${receipt.totalAmount.toFixed(2)}</span>
                      <span className="text-xs text-green-600 ml-2">
                        {new Date(receipt.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <button 
                      className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                      onClick={() => viewReceipt(receipt.id)}
                    >
                      View Receipt
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Existing Invoices */}
          {existingInvoices.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-tactical-grey-600 mb-2">Invoices</h4>
              <div className="space-y-2">
                {existingInvoices.map(invoice => (
                  <div key={invoice.id} className="flex items-center justify-between p-3 bg-tactical-gold-muted border border-tactical-grey-300 rounded-lg">
                    <div>
                      <span className="font-medium text-tactical-brown-dark">{invoice.invoiceNumber}</span>
                      <span className="text-tactical-brown-dark ml-2">${invoice.totalAmount.toFixed(2)}</span>
                      <span className={`text-xs ml-2 px-2 py-1 rounded-full ${
                        invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                        invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {invoice.status}
                      </span>
                    </div>
                    <button 
                      className="text-sm bg-tactical-gold text-white px-3 py-1 rounded hover:bg-tactical-gold-dark"
                      onClick={() => viewInvoice(invoice.id)}
                    >
                      View Invoice
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Smart Suggestions */}
      {billingSuggestion?.type !== 'none' && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center mb-2">
            <span className="text-lg mr-2">💡</span>
            <span className="font-medium text-amber-900">
              {billingSuggestion?.confidence === 'high' ? 'Recommended' : 'Suggested'}
            </span>
          </div>
          
          <p className="text-sm text-amber-800 mb-3">{billingSuggestion?.reason}</p>
          
          <div className="flex space-x-3">
            {billingSuggestion?.type === 'receipt' && (
              <button 
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                onClick={generateReceiptFromConversation}
              >
                <span className="mr-2">🧾</span>
                Generate Receipt
              </button>
            )}
            
            {billingSuggestion?.type === 'invoice' && (
              <button 
                className="flex items-center px-4 py-2 bg-tactical-gold text-white rounded-lg hover:bg-tactical-gold-dark text-sm"
                onClick={generateInvoiceFromConversation}
              >
                <span className="mr-2">📄</span>
                Generate Invoice
              </button>
            )}
          </div>
        </div>
      )}

      {/* Manual Actions */}
      <div className="flex space-x-3 mb-6">
        <button 
          className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-tactical-grey-700 text-sm"
          onClick={() => setShowReceiptForm(true)}
        >
          <span className="mr-2">+</span>
          Create Receipt
        </button>
        <button 
          className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-tactical-grey-700 text-sm"
          onClick={() => setShowInvoiceForm(true)}
        >
          <span className="mr-2">+</span>
          Create Invoice
        </button>
      </div>

      {/* Receipt Form Modal */}
      {showReceiptForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Create Receipt</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={receiptFormData.paymentMethod}
                    onChange={(e) => setReceiptFormData({
                      ...receiptFormData,
                      paymentMethod: e.target.value as Receipt['paymentMethod']
                    })}
                    className="w-full px-3 py-2 border border-tactical-grey-400 rounded-lg focus:ring-2 focus:ring-tactical-gold-500 focus:border-tactical-gold-500"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="e-transfer">E-Transfer</option>
                    <option value="check">Check</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
                    Service Date
                  </label>
                  <input
                    type="date"
                    value={receiptFormData.serviceDate ? new Date(receiptFormData.serviceDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => setReceiptFormData({
                      ...receiptFormData,
                      serviceDate: e.target.value ? new Date(e.target.value) : undefined
                    })}
                    className="w-full px-3 py-2 border border-tactical-grey-400 rounded-lg focus:ring-2 focus:ring-tactical-gold-500 focus:border-tactical-gold-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-tactical-grey-600">Items</label>
                  <button
                    type="button"
                    onClick={addReceiptItem}
                    className="text-sm bg-tactical-gold text-white px-3 py-1 rounded hover:bg-tactical-gold-dark"
                  >
                    Add Item
                  </button>
                </div>
                
                {receiptFormData.items?.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 mb-2 p-3 bg-tactical-grey-100 rounded">
                    <div className="col-span-4">
                      <input
                        type="text"
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => updateReceiptItem(index, 'description', e.target.value)}
                        className="w-full px-2 py-1 border border-tactical-grey-400 rounded text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <select
                        value={item.serviceType}
                        onChange={(e) => updateReceiptItem(index, 'serviceType', e.target.value)}
                        className="w-full px-2 py-1 border border-tactical-grey-400 rounded text-sm"
                      >
                        <option value="consultation">Consultation</option>
                        <option value="landscaping">Landscaping</option>
                        <option value="lawn_care">Lawn Care</option>
                        <option value="snow_removal">Snow Removal</option>
                        <option value="maintenance">Maintenance</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateReceiptItem(index, 'quantity', parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1 border border-tactical-grey-400 rounded text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Price"
                        value={item.unitPrice}
                        onChange={(e) => updateReceiptItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 border border-tactical-grey-400 rounded text-sm"
                      />
                    </div>
                    <div className="col-span-1">
                      <input
                        type="checkbox"
                        checked={item.taxable}
                        onChange={(e) => updateReceiptItem(index, 'taxable', e.target.checked)}
                        className="mt-2"
                        title="Taxable"
                      />
                    </div>
                    <div className="col-span-1">
                      <button
                        type="button"
                        onClick={() => removeReceiptItem(index)}
                        className="text-red-600 hover:text-red-800 mt-1"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
                  Notes
                </label>
                <textarea
                  value={receiptFormData.notes || ''}
                  onChange={(e) => setReceiptFormData({
                    ...receiptFormData,
                    notes: e.target.value
                  })}
                  rows={3}
                  className="w-full px-3 py-2 border border-tactical-grey-400 rounded-lg focus:ring-2 focus:ring-tactical-gold-500 focus:border-tactical-gold-500"
                  placeholder="Additional notes..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowReceiptForm(false)}
                className="px-4 py-2 text-tactical-grey-600 border border-tactical-grey-400 rounded-lg hover:bg-tactical-grey-100"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateReceipt}
                disabled={isLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {isLoading ? 'Creating...' : 'Create Receipt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Form Modal */}
      {showInvoiceForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Create Invoice</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
                    Payment Terms
                  </label>
                  <select
                    value={invoiceFormData.paymentTerms}
                    onChange={(e) => setInvoiceFormData({
                      ...invoiceFormData,
                      paymentTerms: e.target.value as Invoice['paymentTerms']
                    })}
                    className="w-full px-3 py-2 border border-tactical-grey-400 rounded-lg focus:ring-2 focus:ring-tactical-gold-500 focus:border-tactical-gold-500"
                  >
                    <option value="due_on_receipt">Due on Receipt</option>
                    <option value="net15">Net 15</option>
                    <option value="net30">Net 30</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={invoiceFormData.dueDate ? new Date(invoiceFormData.dueDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => setInvoiceFormData({
                      ...invoiceFormData,
                      dueDate: e.target.value ? new Date(e.target.value) : undefined
                    })}
                    className="w-full px-3 py-2 border border-tactical-grey-400 rounded-lg focus:ring-2 focus:ring-tactical-gold-500 focus:border-tactical-gold-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-tactical-grey-600">Items</label>
                  <button
                    type="button"
                    onClick={addInvoiceItem}
                    className="text-sm bg-tactical-gold text-white px-3 py-1 rounded hover:bg-tactical-gold-dark"
                  >
                    Add Item
                  </button>
                </div>
                
                {invoiceFormData.items?.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 mb-2 p-3 bg-tactical-grey-100 rounded">
                    <div className="col-span-4">
                      <input
                        type="text"
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => updateInvoiceItem(index, 'description', e.target.value)}
                        className="w-full px-2 py-1 border border-tactical-grey-400 rounded text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <select
                        value={item.serviceType}
                        onChange={(e) => updateInvoiceItem(index, 'serviceType', e.target.value)}
                        className="w-full px-2 py-1 border border-tactical-grey-400 rounded text-sm"
                      >
                        <option value="consultation">Consultation</option>
                        <option value="landscaping">Landscaping</option>
                        <option value="lawn_care">Lawn Care</option>
                        <option value="snow_removal">Snow Removal</option>
                        <option value="maintenance">Maintenance</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateInvoiceItem(index, 'quantity', parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1 border border-tactical-grey-400 rounded text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Price"
                        value={item.unitPrice}
                        onChange={(e) => updateInvoiceItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 border border-tactical-grey-400 rounded text-sm"
                      />
                    </div>
                    <div className="col-span-1">
                      <input
                        type="checkbox"
                        checked={item.taxable}
                        onChange={(e) => updateInvoiceItem(index, 'taxable', e.target.checked)}
                        className="mt-2"
                        title="Taxable"
                      />
                    </div>
                    <div className="col-span-1">
                      <button
                        type="button"
                        onClick={() => removeInvoiceItem(index)}
                        className="text-red-600 hover:text-red-800 mt-1"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowInvoiceForm(false)}
                className="px-4 py-2 text-tactical-grey-600 border border-tactical-grey-400 rounded-lg hover:bg-tactical-grey-100"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateInvoice}
                disabled={isLoading}
                className="px-4 py-2 bg-tactical-gold text-white rounded-lg hover:bg-tactical-gold-dark disabled:opacity-50"
              >
                {isLoading ? 'Creating...' : 'Create Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
