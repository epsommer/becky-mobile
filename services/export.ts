/**
 * Export Service for React Native
 * Provides CSV and PDF export functionality with native share sheet integration
 */

import { Paths, File, Directory } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { Platform, Alert } from 'react-native';
import { format } from 'date-fns';
import { Receipt, Invoice } from '../types/billing';

// ============================================================================
// Types
// ============================================================================

export interface ExportOptions {
  filename?: string;
  dateRange?: { start: Date; end: Date };
}

export interface ClientExportData {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  status: string;
  serviceLine?: string;
  company?: string;
  address?: string;
  createdAt?: Date;
}

export interface AnalyticsExportData {
  dateRange: { start: string; end: string };
  revenue: {
    total: number;
    byServiceLine: Array<{ name: string; amount: number; percentage: number }>;
  };
  clients: {
    total: number;
    active: number;
    prospect: number;
    completed: number;
    inactive: number;
  };
  billing: {
    pendingInvoices: number;
    pendingAmount: number;
    overdueCount: number;
    overdueAmount: number;
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format currency for export
 */
function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/**
 * Format date for export
 */
function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'yyyy-MM-dd');
}

/**
 * Format date for display
 */
function formatDateDisplay(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'MMM d, yyyy');
}

/**
 * Escape CSV field (handle commas, quotes, newlines)
 */
function escapeCSVField(field: string | number | undefined | null): string {
  if (field === undefined || field === null) return '';
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generate a timestamped filename
 */
function generateFilename(baseName: string, extension: string): string {
  const timestamp = format(new Date(), 'yyyy-MM-dd_HHmmss');
  return `${baseName}_${timestamp}.${extension}`;
}

// ============================================================================
// CSV Generation
// ============================================================================

/**
 * Generate CSV content from data rows
 */
function generateCSV(headers: string[], rows: (string | number | undefined | null)[][]): string {
  const headerLine = headers.map(h => escapeCSVField(h)).join(',');
  const dataLines = rows.map(row => row.map(field => escapeCSVField(field)).join(','));
  return [headerLine, ...dataLines].join('\n');
}

/**
 * Generate CSV for receipts
 */
export function generateReceiptsCSV(receipts: Receipt[]): string {
  const headers = [
    'Receipt Number',
    'Client',
    'Service Date',
    'Payment Date',
    'Status',
    'Payment Method',
    'Subtotal',
    'Tax',
    'Total',
    'Email Status',
    'Notes',
  ];

  const rows = receipts.map(receipt => [
    receipt.receiptNumber,
    receipt.client.name,
    formatDate(receipt.serviceDate),
    formatDate(receipt.paymentDate),
    receipt.status.toUpperCase(),
    receipt.paymentMethod.replace('_', ' ').toUpperCase(),
    formatCurrency(receipt.subtotal),
    formatCurrency(receipt.taxAmount),
    formatCurrency(receipt.totalAmount),
    receipt.emailStatus || 'N/A',
    receipt.notes || '',
  ]);

  return generateCSV(headers, rows);
}

/**
 * Generate CSV for invoices
 */
export function generateInvoicesCSV(invoices: Invoice[]): string {
  const headers = [
    'Invoice Number',
    'Client',
    'Issue Date',
    'Due Date',
    'Status',
    'Payment Terms',
    'Subtotal',
    'Tax',
    'Total',
    'Email Status',
    'Notes',
  ];

  const rows = invoices.map(invoice => [
    invoice.invoiceNumber,
    invoice.client.name,
    formatDate(invoice.createdAt),
    formatDate(invoice.dueDate),
    invoice.status.toUpperCase(),
    invoice.paymentTerms.replace('_', ' ').toUpperCase(),
    formatCurrency(invoice.subtotal),
    formatCurrency(invoice.taxAmount),
    formatCurrency(invoice.totalAmount),
    invoice.emailStatus || 'N/A',
    invoice.notes || '',
  ]);

  return generateCSV(headers, rows);
}

/**
 * Generate CSV for clients
 */
export function generateClientsCSV(clients: ClientExportData[]): string {
  const headers = [
    'Name',
    'Email',
    'Phone',
    'Status',
    'Service Line',
    'Company',
    'Address',
    'Created Date',
  ];

  const rows = clients.map(client => [
    client.name,
    client.email || '',
    client.phone || '',
    client.status.toUpperCase(),
    client.serviceLine || '',
    client.company || '',
    client.address || '',
    client.createdAt ? formatDate(client.createdAt) : '',
  ]);

  return generateCSV(headers, rows);
}

/**
 * Generate CSV for analytics data
 */
export function generateAnalyticsCSV(data: AnalyticsExportData): string {
  const lines: string[] = [];

  // Header section
  lines.push('Analytics Report');
  lines.push(`Date Range,${data.dateRange.start} to ${data.dateRange.end}`);
  lines.push('');

  // Revenue summary
  lines.push('REVENUE SUMMARY');
  lines.push(`Total Revenue,${formatCurrency(data.revenue.total)}`);
  lines.push('');

  // Revenue by service line
  lines.push('REVENUE BY SERVICE LINE');
  lines.push('Service Line,Amount,Percentage');
  data.revenue.byServiceLine.forEach(item => {
    lines.push(`${escapeCSVField(item.name)},${formatCurrency(item.amount)},${item.percentage.toFixed(1)}%`);
  });
  lines.push('');

  // Client metrics
  lines.push('CLIENT METRICS');
  lines.push(`Total Clients,${data.clients.total}`);
  lines.push(`Active Clients,${data.clients.active}`);
  lines.push(`Prospects,${data.clients.prospect}`);
  lines.push(`Completed,${data.clients.completed}`);
  lines.push(`Inactive,${data.clients.inactive}`);
  lines.push('');

  // Billing metrics
  lines.push('BILLING METRICS');
  lines.push(`Pending Invoices,${data.billing.pendingInvoices}`);
  lines.push(`Pending Amount,${formatCurrency(data.billing.pendingAmount)}`);
  lines.push(`Overdue Count,${data.billing.overdueCount}`);
  lines.push(`Overdue Amount,${formatCurrency(data.billing.overdueAmount)}`);

  return lines.join('\n');
}

// ============================================================================
// PDF Generation
// ============================================================================

/**
 * Generate HTML for receipt PDF
 */
function generateReceiptHTML(receipt: Receipt): string {
  const itemRows = receipt.items.map(item => `
    <tr>
      <td>${item.description}</td>
      <td>${item.serviceType.replace('_', ' ').toUpperCase()}</td>
      <td style="text-align: center">${item.quantity}</td>
      <td style="text-align: right">${formatCurrency(item.unitPrice)}</td>
      <td style="text-align: right">${formatCurrency(item.totalPrice)}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Receipt ${receipt.receiptNumber}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 32px; color: #333; font-size: 14px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 24px; margin-bottom: 32px; }
        .company-name { font-size: 28px; font-weight: bold; color: #5c93ff; margin-bottom: 8px; }
        .receipt-title { font-size: 20px; color: #666; }
        .info-section { display: flex; justify-content: space-between; margin-bottom: 32px; }
        .info-block { flex: 1; }
        .info-block.right { text-align: right; }
        .info-block h3 { font-size: 12px; color: #999; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px; }
        .info-block p { margin-bottom: 4px; }
        .info-block .highlight { color: #5c93ff; font-weight: 600; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f5f5f5; font-weight: 600; font-size: 12px; text-transform: uppercase; }
        .totals { width: 280px; margin-left: auto; }
        .totals table { margin-bottom: 0; }
        .totals td { border: none; border-bottom: 1px solid #eee; padding: 8px 0; }
        .totals .total-row { font-weight: bold; font-size: 18px; border-top: 2px solid #333; border-bottom: none; }
        .totals .total-row td { padding-top: 12px; }
        .payment-info { background-color: #e8f4e8; padding: 16px; border-radius: 8px; margin-bottom: 32px; }
        .payment-info h4 { color: #4CAF50; margin-bottom: 8px; }
        .status-badge { display: inline-block; background-color: #4CAF50; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
        .footer { text-align: center; margin-top: 48px; color: #999; font-size: 12px; }
        .notes { background-color: #f9f9f9; padding: 12px; border-radius: 4px; margin-top: 16px; font-style: italic; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-name">Becky CRM</div>
        <div class="receipt-title">RECEIPT</div>
      </div>

      <div class="info-section">
        <div class="info-block">
          <h3>Bill To</h3>
          <p><strong>${receipt.client.name}</strong></p>
          ${receipt.client.company ? `<p>${receipt.client.company}</p>` : ''}
          ${receipt.client.email ? `<p>${receipt.client.email}</p>` : ''}
          ${receipt.client.phone ? `<p>${receipt.client.phone}</p>` : ''}
        </div>
        <div class="info-block right">
          <h3>Receipt Details</h3>
          <p><span class="highlight">${receipt.receiptNumber}</span></p>
          <p>Service Date: ${formatDateDisplay(receipt.serviceDate)}</p>
          <p>Payment Date: ${formatDateDisplay(receipt.paymentDate)}</p>
          <p>Payment: ${receipt.paymentMethod.replace('_', ' ').toUpperCase()}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>Service Type</th>
            <th style="text-align: center">Qty</th>
            <th style="text-align: right">Unit Price</th>
            <th style="text-align: right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>

      <div class="totals">
        <table>
          <tr>
            <td>Subtotal:</td>
            <td style="text-align: right">${formatCurrency(receipt.subtotal)}</td>
          </tr>
          <tr>
            <td>Tax (HST):</td>
            <td style="text-align: right">${formatCurrency(receipt.taxAmount)}</td>
          </tr>
          <tr class="total-row">
            <td>Total:</td>
            <td style="text-align: right">${formatCurrency(receipt.totalAmount)}</td>
          </tr>
        </table>
      </div>

      <div class="payment-info">
        <h4>Payment Information</h4>
        <p><span class="status-badge">PAID</span></p>
        <p style="margin-top: 8px">Payment received via ${receipt.paymentMethod.replace('_', ' ').toUpperCase()}</p>
      </div>

      ${receipt.notes ? `<div class="notes"><strong>Notes:</strong> ${receipt.notes}</div>` : ''}

      <div class="footer">
        <p>Thank you for your business!</p>
        <p>Generated on ${formatDateDisplay(new Date())}</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate HTML for invoice PDF
 */
function generateInvoiceHTML(invoice: Invoice): string {
  const itemRows = invoice.items.map(item => `
    <tr>
      <td>${item.description}</td>
      <td>${item.serviceType.replace('_', ' ').toUpperCase()}</td>
      <td style="text-align: center">${item.quantity}</td>
      <td style="text-align: right">${formatCurrency(item.unitPrice)}</td>
      <td style="text-align: right">${formatCurrency(item.totalPrice)}</td>
    </tr>
  `).join('');

  const isOverdue = invoice.status !== 'paid' && new Date(invoice.dueDate) < new Date();
  const statusColor = invoice.status === 'paid' ? '#4CAF50' : (isOverdue ? '#F44336' : '#FF9800');
  const statusText = isOverdue ? 'OVERDUE' : invoice.status.toUpperCase();

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice ${invoice.invoiceNumber}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 32px; color: #333; font-size: 14px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 24px; margin-bottom: 32px; }
        .company-name { font-size: 28px; font-weight: bold; color: #5c93ff; margin-bottom: 8px; }
        .invoice-title { font-size: 20px; color: #666; }
        .info-section { display: flex; justify-content: space-between; margin-bottom: 32px; }
        .info-block { flex: 1; }
        .info-block.right { text-align: right; }
        .info-block h3 { font-size: 12px; color: #999; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px; }
        .info-block p { margin-bottom: 4px; }
        .info-block .highlight { color: #5c93ff; font-weight: 600; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f5f5f5; font-weight: 600; font-size: 12px; text-transform: uppercase; }
        .totals { width: 280px; margin-left: auto; }
        .totals table { margin-bottom: 0; }
        .totals td { border: none; border-bottom: 1px solid #eee; padding: 8px 0; }
        .totals .total-row { font-weight: bold; font-size: 18px; border-top: 2px solid #333; border-bottom: none; }
        .totals .total-row td { padding-top: 12px; }
        .payment-info { background-color: #e3f2fd; padding: 16px; border-radius: 8px; border-left: 4px solid #5c93ff; margin-bottom: 32px; }
        .payment-info h4 { color: #5c93ff; margin-bottom: 12px; }
        .status-badge { display: inline-block; background-color: ${statusColor}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
        .footer { text-align: center; margin-top: 48px; color: #999; font-size: 12px; }
        .notes { background-color: #f9f9f9; padding: 12px; border-radius: 4px; margin-top: 16px; font-style: italic; }
        .overdue-warning { color: #F44336; font-weight: 600; margin-top: 8px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-name">Becky CRM</div>
        <div class="invoice-title">INVOICE</div>
      </div>

      <div class="info-section">
        <div class="info-block">
          <h3>Bill To</h3>
          <p><strong>${invoice.client.name}</strong></p>
          ${invoice.client.company ? `<p>${invoice.client.company}</p>` : ''}
          ${invoice.client.email ? `<p>${invoice.client.email}</p>` : ''}
          ${invoice.client.phone ? `<p>${invoice.client.phone}</p>` : ''}
        </div>
        <div class="info-block right">
          <h3>Invoice Details</h3>
          <p><span class="highlight">${invoice.invoiceNumber}</span></p>
          <p>Issue Date: ${formatDateDisplay(invoice.createdAt)}</p>
          <p>Due Date: ${formatDateDisplay(invoice.dueDate)}</p>
          <p>Terms: ${invoice.paymentTerms.replace('_', ' ').toUpperCase()}</p>
          <p style="margin-top: 8px"><span class="status-badge">${statusText}</span></p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>Service Type</th>
            <th style="text-align: center">Qty</th>
            <th style="text-align: right">Unit Price</th>
            <th style="text-align: right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>

      <div class="totals">
        <table>
          <tr>
            <td>Subtotal:</td>
            <td style="text-align: right">${formatCurrency(invoice.subtotal)}</td>
          </tr>
          <tr>
            <td>Tax (HST):</td>
            <td style="text-align: right">${formatCurrency(invoice.taxAmount)}</td>
          </tr>
          <tr class="total-row">
            <td>Amount Due:</td>
            <td style="text-align: right">${formatCurrency(invoice.totalAmount)}</td>
          </tr>
        </table>
      </div>

      <div class="payment-info">
        <h4>Payment Information</h4>
        <p><strong>Payment Terms:</strong> ${invoice.paymentTerms.replace('_', ' ').toUpperCase()}</p>
        <p><strong>Due Date:</strong> ${formatDateDisplay(invoice.dueDate)}</p>
        ${isOverdue ? '<p class="overdue-warning">This invoice is overdue. Please remit payment immediately.</p>' : ''}
        <p style="margin-top: 8px">Please include the invoice number (${invoice.invoiceNumber}) with your payment.</p>
      </div>

      ${invoice.notes ? `<div class="notes"><strong>Notes:</strong> ${invoice.notes}</div>` : ''}

      <div class="footer">
        <p>Thank you for your business!</p>
        <p>Generated on ${formatDateDisplay(new Date())}</p>
      </div>
    </body>
    </html>
  `;
}

// ============================================================================
// Export Functions
// ============================================================================

/**
 * Save content to file and share via native share sheet
 */
async function saveAndShare(content: string, filename: string, mimeType: string): Promise<boolean> {
  try {
    // Create file in document directory using new expo-file-system API
    const file = new File(Paths.document, filename);

    // Write file content
    await file.write(content);

    // Check if sharing is available
    const isAvailable = await Sharing.isAvailableAsync();

    if (!isAvailable) {
      Alert.alert(
        'Sharing not available',
        'File has been saved but cannot be shared on this device.',
        [{ text: 'OK' }]
      );
      return false;
    }

    // Open share sheet
    await Sharing.shareAsync(file.uri, {
      mimeType,
      dialogTitle: `Share ${filename}`,
      UTI: mimeType === 'text/csv' ? 'public.comma-separated-values-text' : 'com.adobe.pdf',
    });

    return true;
  } catch (error) {
    console.error('[Export] Error saving and sharing:', error);
    throw error;
  }
}

/**
 * Export receipts to CSV and share
 */
export async function exportReceiptsToCSV(
  receipts: Receipt[],
  options?: ExportOptions
): Promise<boolean> {
  try {
    const csvContent = generateReceiptsCSV(receipts);
    const filename = options?.filename || generateFilename('receipts', 'csv');
    return await saveAndShare(csvContent, filename, 'text/csv');
  } catch (error) {
    console.error('[Export] Error exporting receipts to CSV:', error);
    Alert.alert('Export Error', 'Failed to export receipts. Please try again.');
    return false;
  }
}

/**
 * Export invoices to CSV and share
 */
export async function exportInvoicesToCSV(
  invoices: Invoice[],
  options?: ExportOptions
): Promise<boolean> {
  try {
    const csvContent = generateInvoicesCSV(invoices);
    const filename = options?.filename || generateFilename('invoices', 'csv');
    return await saveAndShare(csvContent, filename, 'text/csv');
  } catch (error) {
    console.error('[Export] Error exporting invoices to CSV:', error);
    Alert.alert('Export Error', 'Failed to export invoices. Please try again.');
    return false;
  }
}

/**
 * Export clients to CSV and share
 */
export async function exportClientsToCSV(
  clients: ClientExportData[],
  options?: ExportOptions
): Promise<boolean> {
  try {
    const csvContent = generateClientsCSV(clients);
    const filename = options?.filename || generateFilename('clients', 'csv');
    return await saveAndShare(csvContent, filename, 'text/csv');
  } catch (error) {
    console.error('[Export] Error exporting clients to CSV:', error);
    Alert.alert('Export Error', 'Failed to export clients. Please try again.');
    return false;
  }
}

/**
 * Export analytics to CSV and share
 */
export async function exportAnalyticsToCSV(
  data: AnalyticsExportData,
  options?: ExportOptions
): Promise<boolean> {
  try {
    const csvContent = generateAnalyticsCSV(data);
    const filename = options?.filename || generateFilename('analytics_report', 'csv');
    return await saveAndShare(csvContent, filename, 'text/csv');
  } catch (error) {
    console.error('[Export] Error exporting analytics to CSV:', error);
    Alert.alert('Export Error', 'Failed to export analytics. Please try again.');
    return false;
  }
}

/**
 * Export a single receipt to PDF and share
 */
export async function exportReceiptToPDF(
  receipt: Receipt,
  options?: ExportOptions
): Promise<boolean> {
  try {
    const html = generateReceiptHTML(receipt);
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    // The print API generates a file at a temp location - share it directly
    // Check if sharing is available
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert(
        'Sharing not available',
        'PDF has been generated but cannot be shared on this device.',
        [{ text: 'OK' }]
      );
      return false;
    }

    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Share Receipt ${receipt.receiptNumber}`,
      UTI: 'com.adobe.pdf',
    });

    return true;
  } catch (error) {
    console.error('[Export] Error exporting receipt to PDF:', error);
    Alert.alert('Export Error', 'Failed to generate PDF. Please try again.');
    return false;
  }
}

/**
 * Export a single invoice to PDF and share
 */
export async function exportInvoiceToPDF(
  invoice: Invoice,
  options?: ExportOptions
): Promise<boolean> {
  try {
    const html = generateInvoiceHTML(invoice);
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    // The print API generates a file at a temp location - share it directly
    // Check if sharing is available
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert(
        'Sharing not available',
        'PDF has been generated but cannot be shared on this device.',
        [{ text: 'OK' }]
      );
      return false;
    }

    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Share Invoice ${invoice.invoiceNumber}`,
      UTI: 'com.adobe.pdf',
    });

    return true;
  } catch (error) {
    console.error('[Export] Error exporting invoice to PDF:', error);
    Alert.alert('Export Error', 'Failed to generate PDF. Please try again.');
    return false;
  }
}

/**
 * Bulk export multiple receipts to PDF (generates individual PDFs)
 * Returns number of successful exports
 */
export async function exportReceiptsToPDFBulk(
  receipts: Receipt[]
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const receipt of receipts) {
    try {
      await exportReceiptToPDF(receipt);
      success++;
    } catch {
      failed++;
    }
  }

  return { success, failed };
}

/**
 * Print a receipt directly
 */
export async function printReceipt(receipt: Receipt): Promise<void> {
  try {
    const html = generateReceiptHTML(receipt);
    await Print.printAsync({ html });
  } catch (error) {
    console.error('[Export] Error printing receipt:', error);
    Alert.alert('Print Error', 'Failed to print receipt. Please try again.');
  }
}

/**
 * Print an invoice directly
 */
export async function printInvoice(invoice: Invoice): Promise<void> {
  try {
    const html = generateInvoiceHTML(invoice);
    await Print.printAsync({ html });
  } catch (error) {
    console.error('[Export] Error printing invoice:', error);
    Alert.alert('Print Error', 'Failed to print invoice. Please try again.');
  }
}

// ============================================================================
// Hook for Export Operations
// ============================================================================

export interface UseExportResult {
  exporting: boolean;
  exportReceiptsCSV: (receipts: Receipt[]) => Promise<boolean>;
  exportInvoicesCSV: (invoices: Invoice[]) => Promise<boolean>;
  exportClientsCSV: (clients: ClientExportData[]) => Promise<boolean>;
  exportAnalyticsCSV: (data: AnalyticsExportData) => Promise<boolean>;
  exportReceiptPDF: (receipt: Receipt) => Promise<boolean>;
  exportInvoicePDF: (invoice: Invoice) => Promise<boolean>;
  printReceipt: (receipt: Receipt) => Promise<void>;
  printInvoice: (invoice: Invoice) => Promise<void>;
}

export function useExport(): UseExportResult {
  const [exporting, setExporting] = React.useState(false);

  const wrapExport = async <T,>(fn: () => Promise<T>): Promise<T> => {
    setExporting(true);
    try {
      return await fn();
    } finally {
      setExporting(false);
    }
  };

  return {
    exporting,
    exportReceiptsCSV: (receipts) => wrapExport(() => exportReceiptsToCSV(receipts)),
    exportInvoicesCSV: (invoices) => wrapExport(() => exportInvoicesToCSV(invoices)),
    exportClientsCSV: (clients) => wrapExport(() => exportClientsToCSV(clients)),
    exportAnalyticsCSV: (data) => wrapExport(() => exportAnalyticsToCSV(data)),
    exportReceiptPDF: (receipt) => wrapExport(() => exportReceiptToPDF(receipt)),
    exportInvoicePDF: (invoice) => wrapExport(() => exportInvoiceToPDF(invoice)),
    printReceipt: (receipt) => wrapExport(() => printReceipt(receipt)),
    printInvoice: (invoice) => wrapExport(() => printInvoice(invoice)),
  };
}

// Import React for the hook
import React from 'react';

export default {
  exportReceiptsToCSV,
  exportInvoicesToCSV,
  exportClientsToCSV,
  exportAnalyticsToCSV,
  exportReceiptToPDF,
  exportInvoiceToPDF,
  exportReceiptsToPDFBulk,
  printReceipt,
  printInvoice,
  useExport,
};
