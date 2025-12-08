// src/types/billing.ts
export interface Receipt {
  id: string;
  receiptNumber: string; // REC-2025-001
  clientId: string;
  client: Client; // Should pull from updated client data
  conversationId?: string; // Link to conversation that generated this receipt
  items: ReceiptItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paymentMethod: 'cash' | 'card' | 'e-transfer' | 'check' | 'other';
  paymentDate: Date;
  serviceDate: Date;
  status: 'draft' | 'sent' | 'paid';
  emailStatus?: 'pending' | 'sent' | 'delivered' | 'failed';
  emailSentAt?: Date;
  emailDeliveredAt?: Date;
  emailError?: string;
  notes?: string;
  archived?: boolean;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReceiptItem {
  id: string;
  description: string;
  serviceType: string; // Service line slug (e.g., 'woodgreen', 'whiteknight', 'pupawalk', 'creative')
  serviceTitle?: string; // Optional: stores the selected service name for display
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxable: boolean;
  billingMode?: 'quantity' | 'hours'; // Optional: defaults to 'quantity'
}

export interface Invoice {
  id: string;
  invoiceNumber: string; // INV-2025-001
  clientId: string;
  client: Client; // Must sync with updated client data
  conversationId?: string;
  items: InvoiceItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  dueDate: Date;
  paymentTerms: 'net15' | 'net30' | 'net45' | 'due_on_receipt';
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  paidAt?: Date;
  receiptId?: string; // Link to receipt when paid
}

export interface InvoiceItem {
  id: string;
  description: string;
  serviceType: string; // Service line slug (e.g., 'woodgreen', 'whiteknight', 'pupawalk', 'creative')
  serviceTitle?: string; // Optional: stores the selected service name for display
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxable: boolean;
  billingMode?: 'quantity' | 'hours'; // Optional: defaults to 'quantity'
}

export interface BillingSuggestion {
  type: 'receipt' | 'invoice' | 'consultation' | 'service' | 'none';
  confidence: 'high' | 'medium' | 'low';
  suggestedItems?: ReceiptItem[] | InvoiceItem[];
  suggestedAmount?: number;
  serviceType?: string;
  reason?: string;
}

export interface CreateReceiptData {
  clientId: string;
  conversationId?: string;
  items: Omit<ReceiptItem, 'id'>[];
  paymentMethod: Receipt['paymentMethod'];
  paymentDate?: Date;
  serviceDate?: Date;
  status?: Receipt['status'];
  notes?: string;
}

export interface CreateInvoiceData {
  clientId: string;
  conversationId?: string;
  items: Omit<InvoiceItem, 'id'>[];
  dueDate?: Date;
  paymentTerms?: Invoice['paymentTerms'];
  notes?: string;
}

// Import Client type from existing types
import { Client } from './client';

// Billing document filters
export interface BillingFilters {
  status?: string;
  dateRange?: { start: string; end: string };
  amountRange?: { min: number; max: number };
  paymentMethod?: string;
  clientId?: string;
  conversationId?: string;
}

// Billing analytics
export interface BillingAnalytics {
  totalRevenue: number;
  totalReceiptsIssued: number;
  totalInvoicesSent: number;
  averageReceiptAmount: number;
  averageInvoiceAmount: number;
  outstandingInvoices: number;
  outstandingAmount: number;
  overdueInvoices: number;
  overdueAmount: number;
  paymentMethodBreakdown: Record<string, number>;
  monthlyRevenue: Array<{
    month: string;
    receipts: number;
    invoices: number;
    total: number;
  }>;
  topServices: Array<{
    serviceType: string;
    count: number;
    revenue: number;
  }>;
}

// Tax configuration
export interface TaxConfig {
  rate: number; // e.g., 0.13 for 13% HST in Ontario
  name: string; // e.g., "HST"
  applicableServices: string[];
}

// Business Configuration
export interface BusinessConfig {
  isRegistered: boolean;
  annualRevenue: number;
  taxRegistrationRequired: boolean;
  taxRate: number;
  currency: string;
}

// Default business configuration for unregistered business
export const DEFAULT_BUSINESS_CONFIG: BusinessConfig = {
  isRegistered: false,
  annualRevenue: 0,
  taxRegistrationRequired: false,
  taxRate: 0.13, // For future use when registered
  currency: 'CAD'
};

// Default tax configuration for Ontario, Canada
export const DEFAULT_TAX_CONFIG: TaxConfig = {
  rate: 0.13, // 13% HST for Ontario, Canada
  name: "HST",
  applicableServices: [
    'landscaping',
    'snow_removal',
    'hair_cutting',
    'creative_development',
    'lawn_care',
    'maintenance',
    'consultation',
    'design',
    'installation',
    'emergency'
  ]
};

// Quote interfaces
export interface Quote {
  id: string;
  quoteNumber: string; // QUO-2025-001
  clientId: string;
  client: Client;
  conversationId?: string;
  items: QuoteItem[];
  subtotal: number;
  taxAmount: number; // Will be 0 for unregistered business
  totalAmount: number;
  taxStatus: 'applicable' | 'not_applicable';
  businessRegistered: boolean;
  validUntil: Date; // Quote expiration date
  status: 'draft' | 'sent' | 'accepted' | 'declined' | 'expired' | 'converted';
  notes?: string;
  terms?: string;
  projectScope?: string; // Detailed scope for larger projects
  estimatedDuration?: string; // "2-3 weeks", "1 month", etc.
  createdAt: Date;
  updatedAt: Date;
  sentAt?: Date;
  acceptedAt?: Date;
  declinedAt?: Date;
  convertedToInvoiceId?: string;
}

export interface QuoteItem {
  id: string;
  description: string;
  serviceCategory: string; // Service line slug (e.g., 'woodgreen', 'whiteknight', 'pupawalk', 'creative')
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  estimatedHours?: number; // For hourly services
  materialsIncluded: boolean;
  notes?: string;
}

export interface CreateQuoteData {
  clientId: string;
  conversationId?: string;
  items: Omit<QuoteItem, 'id'>[];
  validUntil: Date;
  notes?: string;
  terms?: string;
  projectScope?: string;
  estimatedDuration?: string;
  businessRegistered?: boolean;
}
