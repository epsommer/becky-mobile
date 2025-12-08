// src/lib/pdf-generator.ts
import { Receipt, Invoice } from '../types/billing';

// Simple HTML-based PDF generation utility
// In a production environment, you'd use a library like jsPDF, Puppeteer, or a service like PDFKit

export class PDFGenerator {
  
  // Generate HTML content for receipt
  static generateReceiptHTML(receipt: Receipt): string {
    const formatDate = (date: Date) => new Date(date).toLocaleDateString();
    const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Receipt ${receipt.receiptNumber}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .company-name {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .receipt-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
        }
        .client-info, .receipt-details {
            flex: 1;
        }
        .receipt-details {
            text-align: right;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        .items-table th,
        .items-table td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }
        .items-table th {
            background-color: #f5f5f5;
            font-weight: bold;
        }
        .items-table .amount {
            text-align: right;
        }
        .totals {
            margin-left: auto;
            width: 300px;
        }
        .totals table {
            width: 100%;
            border-collapse: collapse;
        }
        .totals td {
            padding: 8px;
            border-bottom: 1px solid #ddd;
        }
        .totals .total-row {
            font-weight: bold;
            font-size: 18px;
            border-top: 2px solid #333;
        }
        .payment-info {
            margin-top: 30px;
            padding: 15px;
            background-color: #f9f9f9;
            border-radius: 5px;
        }
        .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-name">Your Business Name</div>
        <div>123 Business Street, City, Province, Postal Code</div>
        <div>Phone: (555) 123-4567 | Email: info@yourbusiness.com</div>
    </div>

    <div class="receipt-info">
        <div class="client-info">
            <h3>Bill To:</h3>
            <div><strong>${receipt.client.name}</strong></div>
            ${receipt.client.company ? `<div>${receipt.client.company}</div>` : ''}
            ${receipt.client.email ? `<div>${receipt.client.email}</div>` : ''}
            ${receipt.client.phone ? `<div>${receipt.client.phone}</div>` : ''}
        </div>
        <div class="receipt-details">
            <h3>Receipt Details:</h3>
            <div><strong>Receipt #:</strong> ${receipt.receiptNumber}</div>
            <div><strong>Service Date:</strong> ${formatDate(receipt.serviceDate)}</div>
            <div><strong>Payment Date:</strong> ${formatDate(receipt.paymentDate)}</div>
            <div><strong>Payment Method:</strong> ${receipt.paymentMethod.replace('_', ' ').toUpperCase()}</div>
        </div>
    </div>

    <table class="items-table">
        <thead>
            <tr>
                <th>Description</th>
                <th>Service Type</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th class="amount">Total</th>
            </tr>
        </thead>
        <tbody>
            ${receipt.items.map(item => `
                <tr>
                    <td>${item.description}</td>
                    <td>${item.serviceType.replace('_', ' ').toUpperCase()}</td>
                    <td>${item.quantity}</td>
                    <td class="amount">${formatCurrency(item.unitPrice)}</td>
                    <td class="amount">${formatCurrency(item.totalPrice)}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <div class="totals">
        <table>
            <tr>
                <td>Subtotal:</td>
                <td class="amount">${formatCurrency(receipt.subtotal)}</td>
            </tr>
            <tr>
                <td>Tax (HST):</td>
                <td class="amount">${formatCurrency(receipt.taxAmount)}</td>
            </tr>
            <tr class="total-row">
                <td>Total:</td>
                <td class="amount">${formatCurrency(receipt.totalAmount)}</td>
            </tr>
        </table>
    </div>

    <div class="payment-info">
        <strong>Payment Status:</strong> PAID<br>
        <strong>Payment Method:</strong> ${receipt.paymentMethod.replace('_', ' ').toUpperCase()}<br>
        <strong>Payment Date:</strong> ${formatDate(receipt.paymentDate)}
        ${receipt.notes ? `<br><strong>Notes:</strong> ${receipt.notes}` : ''}
    </div>

    <div class="footer">
        <p>Thank you for your business!</p>
        <p>This receipt was generated on ${formatDate(new Date())}</p>
    </div>
</body>
</html>`;
  }

  // Generate HTML content for invoice
  static generateInvoiceHTML(invoice: Invoice): string {
    const formatDate = (date: Date) => new Date(date).toLocaleDateString();
    const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'paid': return '#28a745';
        case 'overdue': return '#dc3545';
        case 'sent': return '#ffc107';
        default: return '#6c757d';
      }
    };

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice ${invoice.invoiceNumber}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .company-name {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .invoice-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
        }
        .client-info, .invoice-details {
            flex: 1;
        }
        .invoice-details {
            text-align: right;
        }
        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 4px;
            color: white;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 12px;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        .items-table th,
        .items-table td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }
        .items-table th {
            background-color: #f5f5f5;
            font-weight: bold;
        }
        .items-table .amount {
            text-align: right;
        }
        .totals {
            margin-left: auto;
            width: 300px;
        }
        .totals table {
            width: 100%;
            border-collapse: collapse;
        }
        .totals td {
            padding: 8px;
            border-bottom: 1px solid #ddd;
        }
        .totals .total-row {
            font-weight: bold;
            font-size: 18px;
            border-top: 2px solid #333;
        }
        .payment-terms {
            margin-top: 30px;
            padding: 15px;
            background-color: #e3f2fd;
            border-radius: 5px;
            border-left: 4px solid #D4AF37;
        }
        .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-name">Your Business Name</div>
        <div>123 Business Street, City, Province, Postal Code</div>
        <div>Phone: (555) 123-4567 | Email: info@yourbusiness.com</div>
    </div>

    <div class="invoice-info">
        <div class="client-info">
            <h3>Bill To:</h3>
            <div><strong>${invoice.client.name}</strong></div>
            ${invoice.client.company ? `<div>${invoice.client.company}</div>` : ''}
            ${invoice.client.email ? `<div>${invoice.client.email}</div>` : ''}
            ${invoice.client.phone ? `<div>${invoice.client.phone}</div>` : ''}
        </div>
        <div class="invoice-details">
            <h3>Invoice Details:</h3>
            <div><strong>Invoice #:</strong> ${invoice.invoiceNumber}</div>
            <div><strong>Issue Date:</strong> ${formatDate(invoice.createdAt)}</div>
            <div><strong>Due Date:</strong> ${formatDate(invoice.dueDate)}</div>
            <div><strong>Payment Terms:</strong> ${invoice.paymentTerms.replace('_', ' ').toUpperCase()}</div>
            <div style="margin-top: 10px;">
                <span class="status-badge" style="background-color: ${getStatusColor(invoice.status)}">
                    ${invoice.status}
                </span>
            </div>
        </div>
    </div>

    <table class="items-table">
        <thead>
            <tr>
                <th>Description</th>
                <th>Service Type</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th class="amount">Total</th>
            </tr>
        </thead>
        <tbody>
            ${invoice.items.map(item => `
                <tr>
                    <td>${item.description}</td>
                    <td>${item.serviceType.replace('_', ' ').toUpperCase()}</td>
                    <td>${item.quantity}</td>
                    <td class="amount">${formatCurrency(item.unitPrice)}</td>
                    <td class="amount">${formatCurrency(item.totalPrice)}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <div class="totals">
        <table>
            <tr>
                <td>Subtotal:</td>
                <td class="amount">${formatCurrency(invoice.subtotal)}</td>
            </tr>
            <tr>
                <td>Tax (HST):</td>
                <td class="amount">${formatCurrency(invoice.taxAmount)}</td>
            </tr>
            <tr class="total-row">
                <td>Amount Due:</td>
                <td class="amount">${formatCurrency(invoice.totalAmount)}</td>
            </tr>
        </table>
    </div>

    <div class="payment-terms">
        <h4>Payment Information:</h4>
        <p><strong>Payment Terms:</strong> ${invoice.paymentTerms.replace('_', ' ').toUpperCase()}</p>
        <p><strong>Due Date:</strong> ${formatDate(invoice.dueDate)}</p>
        ${invoice.status === 'overdue' ? '<p style="color: #dc3545;"><strong>This invoice is overdue. Please remit payment immediately.</strong></p>' : ''}
        <p>Please include the invoice number (${invoice.invoiceNumber}) with your payment.</p>
        ${invoice.notes ? `<p><strong>Notes:</strong> ${invoice.notes}</p>` : ''}
    </div>

    <div class="footer">
        <p>Thank you for your business!</p>
        <p>This invoice was generated on ${formatDate(new Date())}</p>
    </div>
</body>
</html>`;
  }

  // Convert HTML to PDF (placeholder - would use actual PDF library in production)
  static async generateReceiptPDF(receipt: Receipt): Promise<string> {
    // In a real implementation, you would:
    // 1. Use a library like Puppeteer to convert HTML to PDF
    // 2. Or use jsPDF to generate PDF directly
    // 3. Or use a service like PDFShift, HTMLCSStoImage, etc.
    
    const html = this.generateReceiptHTML(receipt);
    
    // For now, return the HTML as a data URL that can be opened in browser
    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
    return dataUrl;
  }

  static async generateInvoicePDF(invoice: Invoice): Promise<string> {
    // Same as above - placeholder implementation
    const html = this.generateInvoiceHTML(invoice);
    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
    return dataUrl;
  }

  // Email-friendly HTML versions (simplified styling for email clients)
  static generateReceiptEmailHTML(receipt: Receipt): string {
    const formatDate = (date: Date) => new Date(date).toLocaleDateString();
    const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

    return `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
    <div style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px;">
        <h1 style="margin: 0; font-size: 24px;">Receipt ${receipt.receiptNumber}</h1>
        <p style="margin: 10px 0 0 0;">Your Business Name</p>
    </div>

    <div style="margin-bottom: 30px;">
        <h3>Receipt Details:</h3>
        <p><strong>Receipt #:</strong> ${receipt.receiptNumber}</p>
        <p><strong>Client:</strong> ${receipt.client.name}</p>
        <p><strong>Service Date:</strong> ${formatDate(receipt.serviceDate)}</p>
        <p><strong>Payment Date:</strong> ${formatDate(receipt.paymentDate)}</p>
        <p><strong>Payment Method:</strong> ${receipt.paymentMethod.replace('_', ' ').toUpperCase()}</p>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
        <thead>
            <tr style="background-color: #f5f5f5;">
                <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Description</th>
                <th style="border: 1px solid #ddd; padding: 12px; text-align: right;">Amount</th>
            </tr>
        </thead>
        <tbody>
            ${receipt.items.map(item => `
                <tr>
                    <td style="border: 1px solid #ddd; padding: 12px;">${item.description}</td>
                    <td style="border: 1px solid #ddd; padding: 12px; text-align: right;">${formatCurrency(item.totalPrice)}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <div style="text-align: right; margin-bottom: 30px;">
        <p><strong>Subtotal: ${formatCurrency(receipt.subtotal)}</strong></p>
        <p><strong>Tax: ${formatCurrency(receipt.taxAmount)}</strong></p>
        <p style="font-size: 18px; border-top: 2px solid #333; padding-top: 10px;"><strong>Total: ${formatCurrency(receipt.totalAmount)}</strong></p>
    </div>

    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px;">
        <p><strong>Payment Status:</strong> PAID</p>
        <p>Thank you for your business!</p>
    </div>
</div>`;
  }

  static generateInvoiceEmailHTML(invoice: Invoice): string {
    const formatDate = (date: Date) => new Date(date).toLocaleDateString();
    const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

    return `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
    <div style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px;">
        <h1 style="margin: 0; font-size: 24px;">Invoice ${invoice.invoiceNumber}</h1>
        <p style="margin: 10px 0 0 0;">Your Business Name</p>
    </div>

    <div style="margin-bottom: 30px;">
        <h3>Invoice Details:</h3>
        <p><strong>Invoice #:</strong> ${invoice.invoiceNumber}</p>
        <p><strong>Client:</strong> ${invoice.client.name}</p>
        <p><strong>Issue Date:</strong> ${formatDate(invoice.createdAt)}</p>
        <p><strong>Due Date:</strong> ${formatDate(invoice.dueDate)}</p>
        <p><strong>Status:</strong> <span style="text-transform: uppercase; font-weight: bold;">${invoice.status}</span></p>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
        <thead>
            <tr style="background-color: #f5f5f5;">
                <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Description</th>
                <th style="border: 1px solid #ddd; padding: 12px; text-align: right;">Amount</th>
            </tr>
        </thead>
        <tbody>
            ${invoice.items.map(item => `
                <tr>
                    <td style="border: 1px solid #ddd; padding: 12px;">${item.description}</td>
                    <td style="border: 1px solid #ddd; padding: 12px; text-align: right;">${formatCurrency(item.totalPrice)}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <div style="text-align: right; margin-bottom: 30px;">
        <p><strong>Subtotal: ${formatCurrency(invoice.subtotal)}</strong></p>
        <p><strong>Tax: ${formatCurrency(invoice.taxAmount)}</strong></p>
        <p style="font-size: 18px; border-top: 2px solid #333; padding-top: 10px;"><strong>Amount Due: ${formatCurrency(invoice.totalAmount)}</strong></p>
    </div>

    <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; border-left: 4px solid #D4AF37;">
        <h4 style="margin-top: 0;">Payment Information:</h4>
        <p><strong>Payment Terms:</strong> ${invoice.paymentTerms.replace('_', ' ').toUpperCase()}</p>
        <p><strong>Due Date:</strong> ${formatDate(invoice.dueDate)}</p>
        <p>Please include the invoice number (${invoice.invoiceNumber}) with your payment.</p>
    </div>
</div>`;
  }
}

export default PDFGenerator;
