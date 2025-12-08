"use client";

import { useState, useEffect } from 'react';
import { X, Edit, Mail, Download, Check, AlertCircle, Clock, Send, CheckCircle, XCircle } from 'lucide-react';
import { Receipt, ReceiptItem } from '../types/billing';
import { Client } from '../types/client';
import { Button } from './ui/button';

interface ReceiptDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: Receipt;
  client: Client;
  onUpdate?: (receipt: Receipt) => void;
  onEmailSent?: (receipt: Receipt) => void;
}

export default function ReceiptDetailsModal({
  isOpen,
  onClose,
  receipt,
  client,
  onUpdate,
  onEmailSent
}: ReceiptDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedReceipt, setEditedReceipt] = useState<Receipt>(receipt);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setEditedReceipt(receipt);
  }, [receipt]);

  const handleSave = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/billing/receipts/${receipt.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editedReceipt),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          onUpdate?.(result.data);
          setIsEditing(false);
          setEmailStatus('Receipt updated successfully');
          setTimeout(() => setEmailStatus(null), 3000);
        }
      } else {
        throw new Error('Failed to update receipt');
      }
    } catch (error) {
      console.error('Error updating receipt:', error);
      setEmailStatus('Failed to update receipt');
      setTimeout(() => setEmailStatus(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    try {
      setIsSendingEmail(true);
      setEmailStatus('Sending receipt via email...');

      const response = await fetch(`/api/billing/receipts/${receipt.id}/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientEmail: client.email,
          clientName: client.name,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setEmailStatus('Receipt sent successfully!');
        onEmailSent?.(result.data);
        setTimeout(() => setEmailStatus(null), 5000);
      } else {
        throw new Error(result.error || 'Failed to send email');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      setEmailStatus('Failed to send receipt via email');
      setTimeout(() => setEmailStatus(null), 5000);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const getStatusBadge = (status: string, emailStatus?: string) => {
    if (emailStatus === 'delivered') {
      return (
        <span className="px-2 py-1 text-xs font-bold bg-green-100 text-green-800 border-2 border-green-200 font-primary uppercase tracking-wide flex items-center">
          <CheckCircle className="w-3 h-3 mr-1" />
          Delivered
        </span>
      );
    }
    
    if (emailStatus === 'sent') {
      return (
        <span className="px-2 py-1 text-xs font-bold bg-tactical-gold-muted text-tactical-brown-dark border-2 border-tactical-gold font-primary uppercase tracking-wide flex items-center">
          <Send className="w-3 h-3 mr-1" />
          Sent
        </span>
      );
    }
    
    if (emailStatus === 'pending' || status === 'pending') {
      return (
        <span className="px-2 py-1 text-xs font-bold bg-orange-100 text-orange-800 border-2 border-orange-200 font-primary uppercase tracking-wide flex items-center">
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </span>
      );
    }

    if (emailStatus === 'failed') {
      return (
        <span className="px-2 py-1 text-xs font-bold bg-red-100 text-red-800 border-2 border-red-200 font-primary uppercase tracking-wide flex items-center">
          <XCircle className="w-3 h-3 mr-1" />
          Failed
        </span>
      );
    }

    const statusColors = {
      draft: 'bg-tactical-grey-200 text-tactical-grey-700 border-tactical-grey-300',
      issued: 'bg-tactical-gold-muted text-tactical-brown-dark border-tactical-gold',
      sent: 'bg-green-100 text-green-800 border-green-200',
    };

    return (
      <span className={`px-2 py-1 text-xs font-bold border-2 font-primary uppercase tracking-wide ${statusColors[status as keyof typeof statusColors] || statusColors.draft}`}>
        {status}
      </span>
    );
  };

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString();
  };

  // Primary item for contextual info
  const primaryItem = receipt.items?.[0];
  const serviceDescription =
    primaryItem?.description ||
    primaryItem?.serviceTitle ||
    primaryItem?.serviceType ||
    "Service";
  const serviceLabel =
    primaryItem?.serviceTitle ||
    primaryItem?.serviceType ||
    "Service";

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
      <div className="neo-container max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded-2xl bg-background text-foreground border border-border shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-border bg-background/95 backdrop-blur sticky top-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold font-primary uppercase tracking-wide text-foreground">
                {isEditing ? 'Edit Receipt' : 'Receipt Details'}
              </h2>
              <div className="flex items-center space-x-3 mt-2">
                <span className="text-sm text-muted-foreground font-primary">
                  {receipt.receiptNumber}
                </span>
                {getStatusBadge(receipt.status, receipt.emailStatus)}
              </div>
            </div>
            <button
              onClick={onClose}
              className="neo-button-sm p-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Status Message */}
          {emailStatus && (
            <div className={`mt-4 p-3 rounded-xl border ${
              emailStatus.includes('successfully') || emailStatus.includes('sent successfully')
                ? 'bg-green-50 border-green-200 text-green-800'
                : emailStatus.includes('Failed') || emailStatus.includes('failed')
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-accent/10 border-accent text-accent-foreground'
            }`}>
              <div className="flex items-center">
                {emailStatus.includes('successfully') ? (
                  <CheckCircle className="w-4 h-4 mr-2" />
                ) : emailStatus.includes('Failed') ? (
                  <XCircle className="w-4 h-4 mr-2" />
                ) : (
                  <Clock className="w-4 h-4 mr-2" />
                )}
                <span className="text-sm font-primary">{emailStatus}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center flex-wrap gap-3 mt-4">
            {!isEditing ? (
              <>
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="outline"
                  size="sm"
                  className="neo-button"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Receipt
                </Button>
                <Button
                  onClick={handleSendEmail}
                  disabled={isSendingEmail || !client.email}
                  size="sm"
                  className="neo-submit"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  {isSendingEmail ? 'Sending...' : 'Send via Email'}
                </Button>
                <Button variant="outline" size="sm" className="neo-button">
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={handleSave}
                  disabled={loading}
                  size="sm"
                  className="neo-submit"
                >
                  <Check className="w-4 h-4 mr-2" />
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  onClick={() => {
                    setIsEditing(false);
                    setEditedReceipt(receipt);
                  }}
                  variant="outline"
                  size="sm"
                  className="neo-button"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          {/* Client Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-primary font-bold text-foreground uppercase tracking-wide text-sm mb-3">
                Bill To
              </h3>
              <div className="space-y-1">
                <div className="font-bold text-foreground">{client.name}</div>
                <div className="text-sm text-muted-foreground">{client.email}</div>
                <div className="text-sm text-muted-foreground">{client.phone}</div>
                {client.address && (
                  <div className="text-sm text-muted-foreground">
                    {client.address.street}<br />
                    {client.address.city}, {client.address.state} {client.address.zip}
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <h3 className="font-primary font-bold text-foreground uppercase tracking-wide text-sm mb-3">
                Receipt Information
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Receipt Number:</span>
                  <span className="text-sm font-bold text-foreground">{receipt.receiptNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Service Date:</span>
                  <span className="text-sm text-foreground">{formatDate(receipt.serviceDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Payment Date:</span>
                  <span className="text-sm text-foreground">{formatDate(receipt.paymentDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Payment Method:</span>
                  <span className="text-sm text-foreground capitalize">{receipt.paymentMethod}</span>
                </div>
                {receipt.emailSentAt && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Email Sent:</span>
                    <span className="text-sm text-foreground">{formatDate(receipt.emailSentAt)}</span>
                  </div>
                )}
                {receipt.emailDeliveredAt && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Email Delivered:</span>
                    <span className="text-sm text-foreground">{formatDate(receipt.emailDeliveredAt)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="space-y-3">
            <h3 className="font-primary font-bold text-foreground uppercase tracking-wide text-sm">
              Services Provided
            </h3>
            <div className="overflow-x-auto neo-inset rounded-xl">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left font-primary font-bold uppercase text-foreground text-xs">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left font-primary font-bold uppercase text-foreground text-xs">
                      Quantity
                    </th>
                    <th className="px-4 py-3 text-left font-primary font-bold uppercase text-foreground text-xs">
                      Unit Price
                    </th>
                    <th className="px-4 py-3 text-left font-primary font-bold uppercase text-foreground text-xs">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {receipt.items.map((item) => (
                    <tr key={item.id} className="border-t border-border">
                      <td className="px-4 py-3 text-sm text-foreground">
                        {item.description || serviceDescription}
                        <div className="text-xs text-muted-foreground capitalize">
                          {(item.serviceTitle || item.serviceType || serviceLabel || '').replace(/_/g, ' ')}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">{item.quantity}</td>
                      <td className="px-4 py-3 text-sm text-foreground">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-4 py-3 text-sm font-bold text-foreground">{formatCurrency(item.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-80">
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Subtotal:</span>
                  <span className="text-sm text-foreground">{formatCurrency(receipt.subtotal)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Tax:</span>
                  <span className="text-sm text-foreground">{formatCurrency(receipt.taxAmount)}</span>
                </div>
                <div className="flex justify-between py-3 border-t-2 border-dark-grey">
                  <span className="font-bold text-lg text-foreground font-primary uppercase">Total:</span>
                  <span className="font-bold text-lg text-foreground font-primary">{formatCurrency(receipt.totalAmount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {receipt.notes && (
            <div className="space-y-2">
              <h3 className="font-primary font-bold text-foreground uppercase tracking-wide text-sm">
                Notes
              </h3>
              <div className="p-4 neo-inset rounded-xl">
                <p className="text-sm text-foreground">{receipt.notes}</p>
              </div>
            </div>
          )}

          {/* Email Error */}
          {receipt.emailError && (
            <div className="p-4 rounded-xl border border-red-200 bg-red-50">
              <div className="flex items-center">
                <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
                <span className="text-sm font-bold text-red-800">Email Error:</span>
              </div>
              <p className="text-sm text-red-700 mt-1">{receipt.emailError}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
