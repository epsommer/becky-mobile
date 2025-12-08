import { Receipt } from '../types/billing';
import { calculateSubtotal, calculateTax, calculateTotal } from '../types/billing';

/**
 * Generates HTML for a receipt that can be converted to PDF
 */
export function generateReceiptHTML(receipt: Receipt): string {
  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatPaymentMethod = (method: string) => {
    return method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const subtotal = calculateSubtotal(receipt.items);
  const tax = calculateTax(receipt.items);
  const total = calculateTotal(receipt.items);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt ${receipt.receiptNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #333;
      padding: 40px;
      background: #fff;
    }

    .receipt-container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      border: 1px solid #e0e0e0;
    }

    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #333;
    }

    .header h1 {
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 8px;
      color: #1a1a1a;
    }

    .header .business-name {
      font-size: 24px;
      font-weight: 600;
      color: #4CAF50;
      margin-bottom: 4px;
    }

    .header .tagline {
      font-size: 14px;
      color: #666;
      font-style: italic;
    }

    .receipt-meta {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
      padding: 20px;
      background: #f5f5f5;
      border-radius: 8px;
    }

    .receipt-meta .meta-group {
      flex: 1;
    }

    .receipt-meta .label {
      font-size: 12px;
      text-transform: uppercase;
      color: #666;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .receipt-meta .value {
      font-size: 16px;
      font-weight: 700;
      color: #333;
    }

    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
    }

    .status-paid {
      background: #E8F5E9;
      color: #4CAF50;
      border: 1px solid #4CAF50;
    }

    .status-sent {
      background: #E3F2FD;
      color: #2196F3;
      border: 1px solid #2196F3;
    }

    .status-draft {
      background: #FFF3E0;
      color: #FF9800;
      border: 1px solid #FF9800;
    }

    .section {
      margin-bottom: 30px;
    }

    .section-title {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 12px;
      color: #1a1a1a;
      border-bottom: 1px solid #e0e0e0;
      padding-bottom: 8px;
    }

    .client-info {
      padding: 16px;
      background: #fafafa;
      border-left: 4px solid #4CAF50;
      border-radius: 4px;
    }

    .client-info p {
      margin-bottom: 6px;
      color: #333;
    }

    .client-info strong {
      color: #1a1a1a;
      font-weight: 600;
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
    }

    .items-table thead {
      background: #f5f5f5;
    }

    .items-table th {
      text-align: left;
      padding: 12px;
      font-size: 12px;
      text-transform: uppercase;
      color: #666;
      font-weight: 700;
      border-bottom: 2px solid #e0e0e0;
    }

    .items-table th.right {
      text-align: right;
    }

    .items-table td {
      padding: 14px 12px;
      border-bottom: 1px solid #e0e0e0;
      color: #333;
    }

    .items-table td.right {
      text-align: right;
    }

    .items-table .item-description {
      font-weight: 600;
      color: #1a1a1a;
    }

    .items-table .item-meta {
      font-size: 12px;
      color: #666;
      margin-top: 4px;
    }

    .totals {
      margin-top: 20px;
      padding: 20px;
      background: #fafafa;
      border-radius: 8px;
    }

    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 15px;
    }

    .totals-row.total {
      border-top: 2px solid #333;
      margin-top: 8px;
      padding-top: 12px;
      font-size: 18px;
      font-weight: 700;
      color: #1a1a1a;
    }

    .totals-row .label {
      color: #666;
    }

    .totals-row .value {
      font-weight: 600;
      color: #333;
    }

    .totals-row.total .value {
      color: #4CAF50;
    }

    .payment-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      padding: 16px;
      background: #fafafa;
      border-radius: 8px;
    }

    .payment-info-item {
      display: flex;
      flex-direction: column;
    }

    .payment-info-item .label {
      font-size: 12px;
      text-transform: uppercase;
      color: #666;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .payment-info-item .value {
      font-size: 14px;
      color: #333;
      font-weight: 600;
    }

    .notes {
      padding: 16px;
      background: #fffef0;
      border-left: 4px solid #FFC107;
      border-radius: 4px;
      color: #333;
      line-height: 1.6;
    }

    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      text-align: center;
      color: #666;
      font-size: 12px;
    }

    @media print {
      body {
        padding: 0;
      }

      .receipt-container {
        border: none;
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="header">
      <div class="business-name">Evangelo Sommer Lawn Care</div>
      <div class="tagline">Professional Lawn & Property Services</div>
      <h1>Receipt</h1>
    </div>

    <div class="receipt-meta">
      <div class="meta-group">
        <div class="label">Receipt Number</div>
        <div class="value">${receipt.receiptNumber}</div>
      </div>
      <div class="meta-group">
        <div class="label">Date Issued</div>
        <div class="value">${formatDate(receipt.createdAt)}</div>
      </div>
      <div class="meta-group">
        <div class="label">Status</div>
        <div class="value">
          <span class="status-badge status-${receipt.status}">
            ${receipt.status.toUpperCase()}
          </span>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Bill To</div>
      <div class="client-info">
        <p><strong>${receipt.client.name}</strong></p>
        ${receipt.client.email ? `<p>Email: ${receipt.client.email}</p>` : ''}
        ${receipt.client.phone ? `<p>Phone: ${receipt.client.phone}</p>` : ''}
      </div>
    </div>

    <div class="section">
      <div class="section-title">Services Provided</div>
      <table class="items-table">
        <thead>
          <tr>
            <th>Description</th>
            <th class="right">Qty/Hrs</th>
            <th class="right">Rate</th>
            <th class="right">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${receipt.items.map(item => `
            <tr>
              <td>
                <div class="item-description">${item.description}</div>
                ${item.billingMode === 'hours' ? '<div class="item-meta">Hourly rate</div>' : ''}
                ${!item.taxable ? '<div class="item-meta">Tax exempt</div>' : ''}
              </td>
              <td class="right">${item.quantity}</td>
              <td class="right">${formatCurrency(item.unitPrice)}</td>
              <td class="right">${formatCurrency(item.totalPrice)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="totals">
        <div class="totals-row">
          <span class="label">Subtotal</span>
          <span class="value">${formatCurrency(subtotal)}</span>
        </div>
        <div class="totals-row">
          <span class="label">Tax (HST 13%)</span>
          <span class="value">${formatCurrency(tax)}</span>
        </div>
        <div class="totals-row total">
          <span class="label">Total</span>
          <span class="value">${formatCurrency(total)}</span>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Payment Information</div>
      <div class="payment-info">
        <div class="payment-info-item">
          <span class="label">Payment Method</span>
          <span class="value">${formatPaymentMethod(receipt.paymentMethod)}</span>
        </div>
        <div class="payment-info-item">
          <span class="label">Payment Date</span>
          <span class="value">${formatDate(receipt.paymentDate)}</span>
        </div>
        <div class="payment-info-item">
          <span class="label">Service Date</span>
          <span class="value">${formatDate(receipt.serviceDate)}</span>
        </div>
        <div class="payment-info-item">
          <span class="label">Amount Paid</span>
          <span class="value">${formatCurrency(total)}</span>
        </div>
      </div>
    </div>

    ${receipt.notes ? `
      <div class="section">
        <div class="section-title">Notes</div>
        <div class="notes">${receipt.notes}</div>
      </div>
    ` : ''}

    <div class="footer">
      <p>Thank you for your business!</p>
      <p>This receipt was generated on ${formatDate(new Date())}</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Downloads a receipt as PDF (for web) or returns HTML for mobile PDF generation
 */
export async function downloadReceiptPDF(receipt: Receipt): Promise<string> {
  const html = generateReceiptHTML(receipt);

  // For React Native, return the HTML so it can be used with react-native-html-to-pdf
  // or react-native-print
  return html;
}

/**
 * Generates filename for the receipt PDF
 */
export function generateReceiptFilename(receipt: Receipt): string {
  const receiptNumber = receipt.receiptNumber.replace(/[^a-zA-Z0-9]/g, '-');
  const clientName = receipt.client.name.replace(/[^a-zA-Z0-9]/g, '-');
  return `receipt-${receiptNumber}-${clientName}.pdf`;
}
