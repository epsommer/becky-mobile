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
