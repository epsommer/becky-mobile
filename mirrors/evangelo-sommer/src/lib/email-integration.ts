// src/lib/email-integration.ts
import { Receipt, Invoice } from '../types/billing';
import PDFGenerator from './pdf-generator';

// Simple email integration utility
// In a production environment, you'd use a service like SendGrid, Mailgun, or AWS SES

export interface EmailConfig {
  fromEmail: string;
  fromName: string;
  replyTo?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class EmailIntegration {
  private config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
  }

  // Send receipt via email
  async sendReceipt(receipt: Receipt, customMessage?: string): Promise<EmailResult> {
    try {
      if (!receipt.client.email) {
        throw new Error('Client email address is required');
      }

      const subject = `Receipt ${receipt.receiptNumber} - Thank you for your payment`;
      const htmlContent = this.generateReceiptEmailContent(receipt, customMessage);
      
      // In a real implementation, you would use an email service here
      console.log('Sending receipt email:', {
        to: receipt.client.email,
        subject,
        html: htmlContent
      });

      // Simulate email sending
      await this.simulateEmailSend();

      return {
        success: true,
        messageId: `receipt_${receipt.id}_${Date.now()}`
      };
    } catch (error) {
      console.error('Error sending receipt email:', error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  // Send invoice via email
  async sendInvoice(invoice: Invoice, customMessage?: string): Promise<EmailResult> {
    try {
      if (!invoice.client.email) {
        throw new Error('Client email address is required');
      }

      const subject = `Invoice ${invoice.invoiceNumber} - Payment Required`;
      const htmlContent = this.generateInvoiceEmailContent(invoice, customMessage);
      
      // In a real implementation, you would use an email service here
      console.log('Sending invoice email:', {
        to: invoice.client.email,
        subject,
        html: htmlContent
      });

      // Simulate email sending
      await this.simulateEmailSend();

      return {
        success: true,
        messageId: `invoice_${invoice.id}_${Date.now()}`
      };
    } catch (error) {
      console.error('Error sending invoice email:', error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  // Generate email content for receipt
  private generateReceiptEmailContent(receipt: Receipt, customMessage?: string): string {
    const receiptHtml = PDFGenerator.generateReceiptEmailHTML(receipt);
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Receipt ${receipt.receiptNumber}</title>
</head>
<body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="background-color: #D4AF37; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Payment Receipt</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Thank you for your payment!</p>
        </div>
        
        <!-- Custom Message -->
        ${customMessage ? `
        <div style="padding: 20px; background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
            <p style="margin: 0; color: #475569; font-style: italic;">${customMessage}</p>
        </div>
        ` : ''}
        
        <!-- Receipt Content -->
        <div style="padding: 20px;">
            ${receiptHtml}
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0; color: #64748b; font-size: 14px;">
                If you have any questions about this receipt, please contact us at ${this.config.replyTo || this.config.fromEmail}
            </p>
            <p style="margin: 10px 0 0 0; color: #94a3b8; font-size: 12px;">
                This is an automated email. Please do not reply directly to this message.
            </p>
        </div>
    </div>
</body>
</html>`;
  }

  // Generate email content for invoice
  private generateInvoiceEmailContent(invoice: Invoice, customMessage?: string): string {
    const invoiceHtml = PDFGenerator.generateInvoiceEmailHTML(invoice);
    const isOverdue = invoice.status === 'overdue' || (invoice.status === 'sent' && new Date() > invoice.dueDate);
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice ${invoice.invoiceNumber}</title>
</head>
<body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="background-color: ${isOverdue ? '#dc2626' : '#D4AF37'}; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">${isOverdue ? 'Overdue Invoice' : 'Invoice'}</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">
                ${isOverdue ? 'Payment is past due' : 'Payment requested'}
            </p>
        </div>
        
        <!-- Urgency Notice -->
        ${isOverdue ? `
        <div style="padding: 15px; background-color: #fef2f2; border-left: 4px solid #dc2626; margin: 0;">
            <p style="margin: 0; color: #dc2626; font-weight: bold;">
                ⚠️ This invoice is overdue. Please remit payment immediately to avoid any service interruptions.
            </p>
        </div>
        ` : ''}
        
        <!-- Custom Message -->
        ${customMessage ? `
        <div style="padding: 20px; background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
            <p style="margin: 0; color: #475569; font-style: italic;">${customMessage}</p>
        </div>
        ` : ''}
        
        <!-- Invoice Content -->
        <div style="padding: 20px;">
            ${invoiceHtml}
        </div>
        
        <!-- Payment Instructions -->
        <div style="background-color: #e0f2fe; padding: 20px; border-top: 1px solid #b3e5fc;">
            <h3 style="margin: 0 0 15px 0; color: #D4AF37;">Payment Instructions</h3>
            <div style="color: #8B4513; font-size: 14px; line-height: 1.6;">
                <p style="margin: 0 0 10px 0;"><strong>Payment Methods Accepted:</strong></p>
                <ul style="margin: 0 0 15px 20px; padding: 0;">
                    <li>E-Transfer to: ${this.config.fromEmail}</li>
                    <li>Cash or Card (in person)</li>
                    <li>Check made payable to: ${this.config.fromName}</li>
                </ul>
                <p style="margin: 0;"><strong>Please include invoice number ${invoice.invoiceNumber} with your payment.</strong></p>
            </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0; color: #64748b; font-size: 14px;">
                Questions about this invoice? Contact us at ${this.config.replyTo || this.config.fromEmail}
            </p>
            <p style="margin: 10px 0 0 0; color: #94a3b8; font-size: 12px;">
                This is an automated email. Please do not reply directly to this message.
            </p>
        </div>
    </div>
</body>
</html>`;
  }

  // Simulate email sending (replace with actual email service)
  private async simulateEmailSend(): Promise<void> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // In a real implementation, you would:
    // 1. Use SendGrid: await sgMail.send(emailData)
    // 2. Use Mailgun: await mailgun.messages().send(emailData)
    // 3. Use AWS SES: await ses.sendEmail(emailParams).promise()
    // 4. Use Nodemailer: await transporter.sendMail(mailOptions)
    
    console.log('Email sent successfully (simulated)');
  }

  // Send payment reminder for overdue invoices
  async sendPaymentReminder(invoice: Invoice, reminderMessage?: string): Promise<EmailResult> {
    const defaultMessage = `This is a friendly reminder that your invoice ${invoice.invoiceNumber} is past due. Please submit payment at your earliest convenience to avoid any service interruptions.`;
    
    return await this.sendInvoice(invoice, reminderMessage || defaultMessage);
  }

  // Send receipt confirmation after payment
  async sendReceiptConfirmation(receipt: Receipt, thankYouMessage?: string): Promise<EmailResult> {
    const defaultMessage = `Thank you for your prompt payment! We appreciate your business and look forward to serving you again.`;
    
    return await this.sendReceipt(receipt, thankYouMessage || defaultMessage);
  }

  // Bulk send invoices (for monthly billing, etc.)
  async sendBulkInvoices(invoices: Invoice[], customMessage?: string): Promise<EmailResult[]> {
    const results: EmailResult[] = [];
    
    for (const invoice of invoices) {
      try {
        const result = await this.sendInvoice(invoice, customMessage);
        results.push(result);
        
        // Add delay between emails to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        results.push({
          success: false,
          error: `Failed to send invoice ${invoice.invoiceNumber}: ${(error as Error).message}`
        });
      }
    }
    
    return results;
  }

  // Update email configuration
  updateConfig(newConfig: Partial<EmailConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Default email configuration
const DEFAULT_EMAIL_CONFIG: EmailConfig = {
  fromEmail: 'billing@yourbusiness.com',
  fromName: 'Your Business Name',
  replyTo: 'support@yourbusiness.com'
};

// Export singleton instance
export const emailIntegration = new EmailIntegration(DEFAULT_EMAIL_CONFIG);
export default emailIntegration;
