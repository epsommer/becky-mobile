// types/billing.ts
export interface Receipt {
  id: string;
  receiptNumber: string; // REC-2025-001
  clientId: string;
  client: Client;
  conversationId?: string;
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
  serviceType: string; // Service line slug
  serviceTitle?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxable: boolean;
  billingMode?: 'quantity' | 'hours';
}

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  serviceId?: string;
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

export interface ServiceLine {
  id: string;
  name: string;
  slug: string;
  route: string;
}

export interface ServiceTemplate {
  id: string;
  name: string;
  descriptionTemplate: string;
  unitPrice: number;
}

export interface TaxConfig {
  rate: number; // e.g., 0.13 for 13% HST in Ontario
  name: string; // e.g., "HST"
  applicableServices: string[];
}

// Default tax configuration for Ontario, Canada
export const DEFAULT_TAX_CONFIG: TaxConfig = {
  rate: 0.13, // 13% HST
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

// Helper functions
export function calculateSubtotal(items: ReceiptItem[]): number {
  return items.reduce((sum, item) => sum + item.totalPrice, 0);
}

export function calculateTax(items: ReceiptItem[], taxConfig: TaxConfig = DEFAULT_TAX_CONFIG): number {
  const taxableAmount = items
    .filter(item => item.taxable)
    .reduce((sum, item) => sum + item.totalPrice, 0);

  return taxableAmount * taxConfig.rate;
}

export function calculateTotal(items: ReceiptItem[], taxConfig: TaxConfig = DEFAULT_TAX_CONFIG): number {
  return calculateSubtotal(items) + calculateTax(items, taxConfig);
}

export function createEmptyReceiptItem(serviceType: string = ''): ReceiptItem {
  return {
    id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    description: '',
    serviceType: serviceType,
    serviceTitle: '',
    quantity: 1,
    unitPrice: 0,
    totalPrice: 0,
    taxable: true,
    billingMode: 'quantity'
  };
}

// Invoice types
export type PaymentTerms = 'due_on_receipt' | 'net15' | 'net30' | 'net45';

export interface InvoiceItem {
  id: string;
  description: string;
  serviceType: string;
  serviceTitle?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxable: boolean;
  billingMode?: 'quantity' | 'hours';
}

export interface Invoice {
  id: string;
  invoiceNumber: string; // INV-2025-001
  clientId: string;
  client: Client;
  conversationId?: string;
  items: InvoiceItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paymentTerms: PaymentTerms;
  invoiceDate: Date;
  dueDate: Date;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  emailStatus?: 'pending' | 'sent' | 'delivered' | 'failed';
  emailSentAt?: Date;
  emailDeliveredAt?: Date;
  emailError?: string;
  notes?: string;
  archived?: boolean;
  archivedAt?: Date;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInvoiceData {
  clientId: string;
  conversationId?: string;
  items: Omit<InvoiceItem, 'id'>[];
  paymentTerms: PaymentTerms;
  invoiceDate?: Date;
  dueDate?: Date;
  status?: Invoice['status'];
  notes?: string;
}

export interface UpdateInvoiceData {
  items?: Omit<InvoiceItem, 'id'>[];
  paymentTerms?: PaymentTerms;
  dueDate?: Date;
  status?: Invoice['status'];
  notes?: string;
}

export function createEmptyInvoiceItem(serviceType: string = ''): InvoiceItem {
  return {
    id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    description: '',
    serviceType: serviceType,
    serviceTitle: '',
    quantity: 1,
    unitPrice: 0,
    totalPrice: 0,
    taxable: true,
    billingMode: 'quantity'
  };
}

export function calculateDefaultDueDate(paymentTerms: PaymentTerms, fromDate: Date = new Date()): Date {
  switch (paymentTerms) {
    case 'due_on_receipt':
      return fromDate;
    case 'net15':
      return new Date(fromDate.getTime() + 15 * 24 * 60 * 60 * 1000);
    case 'net30':
      return new Date(fromDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    case 'net45':
      return new Date(fromDate.getTime() + 45 * 24 * 60 * 60 * 1000);
    default:
      return new Date(fromDate.getTime() + 30 * 24 * 60 * 60 * 1000);
  }
}

export function getPaymentTermsLabel(terms: PaymentTerms): string {
  switch (terms) {
    case 'due_on_receipt': return 'Due on Receipt';
    case 'net15': return 'Net 15 Days';
    case 'net30': return 'Net 30 Days';
    case 'net45': return 'Net 45 Days';
    default: return 'Net 30 Days';
  }
}

export function isInvoiceOverdue(invoice: Invoice): boolean {
  if (invoice.status === 'paid' || invoice.status === 'draft') {
    return false;
  }
  return new Date() > new Date(invoice.dueDate);
}
