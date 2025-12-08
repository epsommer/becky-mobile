import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '../../../../../../lib/prisma';
import { google } from 'googleapis';
import { Resend } from 'resend';
import nodemailer, { SendMailOptions } from 'nodemailer';
import sgMail from '@sendgrid/mail';
import { logReceiptSent } from '../../../../../../lib/activity-logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../../lib/auth';

interface ReceiptItem {
  description: string;
  serviceType?: string;
}
interface ReceiptData {
  receiptNumber: string;
  totalAmount: number;
  serviceDate: string | Date;
  serviceType?: string;
  items: ReceiptItem[];
}

// Service-specific email configuration
function getServiceEmail(serviceType?: string): string {
  const serviceEmails = {
    'landscaping': 'sales@woodgreenlandscaping.com',
    'woodgreen': 'sales@woodgreenlandscaping.com',
    'lawn_care': 'sales@woodgreenlandscaping.com',
    'maintenance': 'sales@woodgreenlandscaping.com',
    'snow_removal': 'sales@whiteknightsnowservice.com',
    'whiteknight': 'sales@whiteknightsnowservice.com',
    'hair_cutting': 'sales@pupawalk.com',  // Pet services
    'pupawalk': 'sales@pupawalk.com',
    'creative': 'sales@evangelosommer.com',
    'portfolio': 'sales@evangelosommer.com',
    'creative_development': 'sales@evangelosommer.com',
    'consultation': 'sales@evangelosommer.com',
    'design': 'sales@evangelosommer.com',
    'installation': 'sales@evangelosommer.com',
    'emergency': 'sales@evangelosommer.com'
  };

  return serviceEmails[serviceType as keyof typeof serviceEmails] || 'sales@evangelosommer.com';
}

// Service-specific SMTP configuration
function getServiceSMTPConfig() {
  // Use the same SMTP configuration for all services for now
  // All authenticate with admin@evangelosommer.com but send from service-specific addresses
  return {
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS_B64 ? Buffer.from(process.env.SMTP_PASS_B64, 'base64').toString() : ''
    },
    tls: {
      rejectUnauthorized: true,
      minVersion: 'TLSv1.2' as const
    }
  };
}

function getServiceName(serviceType?: string): string {
  const serviceNames = {
    'landscaping': 'Woodgreen Landscaping',
    'woodgreen': 'Woodgreen Landscaping',
    'lawn_care': 'Woodgreen Landscaping',
    'maintenance': 'Woodgreen Landscaping',
    'snow_removal': 'White Knight Snow Service',
    'whiteknight': 'White Knight Snow Service',
    'hair_cutting': 'Pupawalk Pet Services',
    'pupawalk': 'Pupawalk Pet Services',
    'creative': 'Evangelo Sommer',
    'portfolio': 'Evangelo Sommer',
    'creative_development': 'Evangelo Sommer',
    'consultation': 'Evangelo Sommer',
    'design': 'Evangelo Sommer',
    'installation': 'Evangelo Sommer',
    'emergency': 'Evangelo Sommer'
  };

  return serviceNames[serviceType as keyof typeof serviceNames] || 'Evangelo Sommer';
}

function getServiceBrand(serviceType?: string): { name: string; email: string; color: string } {
  const serviceBrands = {
    'landscaping': {
      name: 'Woodgreen Landscaping',
      email: 'sales@woodgreenlandscaping.com',
      color: '#22C55E' // Green
    },
    'woodgreen': {
      name: 'Woodgreen Landscaping',
      email: 'sales@woodgreenlandscaping.com',
      color: '#22C55E' // Green
    },
    'lawn_care': {
      name: 'Woodgreen Landscaping',
      email: 'sales@woodgreenlandscaping.com',
      color: '#22C55E' // Green
    },
    'maintenance': {
      name: 'Woodgreen Landscaping',
      email: 'sales@woodgreenlandscaping.com',
      color: '#22C55E' // Green
    },
    'snow_removal': {
      name: 'White Knight Snow Service',
      email: 'sales@whiteknightsnowservice.com',
      color: '#6B7280' // Tactical Grey (no blue for snow service)
    },
    'whiteknight': {
      name: 'White Knight Snow Service',
      email: 'sales@whiteknightsnowservice.com',
      color: '#6B7280' // Tactical Grey
    },
    'hair_cutting': {
      name: 'Pupawalk Pet Services',
      email: 'sales@pupawalk.com',
      color: '#F59E0B' // Orange
    },
    'pupawalk': {
      name: 'Pupawalk Pet Services',
      email: 'sales@pupawalk.com',
      color: '#F59E0B' // Orange
    },
    'creative': {
      name: 'Evangelo Sommer',
      email: 'sales@evangelosommer.com',
      color: '#D4AF37' // Gold
    },
    'portfolio': {
      name: 'Evangelo Sommer',
      email: 'sales@evangelosommer.com',
      color: '#D4AF37' // Gold
    },
    'creative_development': {
      name: 'Evangelo Sommer',
      email: 'sales@evangelosommer.com',
      color: '#D4AF37' // Gold
    },
    'consultation': {
      name: 'Evangelo Sommer',
      email: 'sales@evangelosommer.com',
      color: '#D4AF37' // Gold
    },
    'design': {
      name: 'Evangelo Sommer',
      email: 'sales@evangelosommer.com',
      color: '#D4AF37' // Gold
    },
    'installation': {
      name: 'Evangelo Sommer',
      email: 'sales@evangelosommer.com',
      color: '#D4AF37' // Gold
    },
    'emergency': {
      name: 'Evangelo Sommer',
      email: 'sales@evangelosommer.com',
      color: '#D4AF37' // Gold
    }
  };

  return serviceBrands[serviceType as keyof typeof serviceBrands] || serviceBrands.creative;
}

function getServiceContact(serviceType?: string): { name: string; address: string; phone: string; email: string } {
  const serviceContacts = {
    'landscaping': {
      name: 'Woodgreen Landscaping',
      address: '84 Newton Dr., Toronto, ON M2M 2M9',
      phone: '(647) 327-8401',
      email: 'sales@woodgreenlandscaping.com'
    },
    'lawn_care': {
      name: 'Woodgreen Landscaping',
      address: '84 Newton Dr., Toronto, ON M2M 2M9',
      phone: '(647) 327-8401',
      email: 'sales@woodgreenlandscaping.com'
    },
    'maintenance': {
      name: 'Woodgreen Landscaping',
      address: '84 Newton Dr., Toronto, ON M2M 2M9',
      phone: '(647) 327-8401',
      email: 'sales@woodgreenlandscaping.com'
    },
    'snow_removal': {
      name: 'White Knight Snow Service',
      address: '84 Newton Dr., Toronto, ON M2M 2M9',
      phone: '(647) 327-8401',
      email: 'sales@whiteknightsnowservice.com'
    },
    'hair_cutting': {
      name: 'Pupawalk Pet Services',
      address: '84 Newton Dr., Toronto, ON M2M 2M9',
      phone: '(647) 327-8401',
      email: 'sales@pupawalk.com'
    },
    'creative_development': {
      name: 'Evangelo Sommer',
      address: '84 Newton Dr., Toronto, ON M2M 2M9',
      phone: '(647) 327-8401',
      email: 'sales@evangelosommer.com'
    },
    'consultation': {
      name: 'Evangelo Sommer',
      address: '84 Newton Dr., Toronto, ON M2M 2M9',
      phone: '(647) 327-8401',
      email: 'sales@evangelosommer.com'
    },
    'design': {
      name: 'Evangelo Sommer',
      address: '84 Newton Dr., Toronto, ON M2M 2M9',
      phone: '(647) 327-8401',
      email: 'sales@evangelosommer.com'
    },
    'installation': {
      name: 'Evangelo Sommer',
      address: '84 Newton Dr., Toronto, ON M2M 2M9',
      phone: '(647) 327-8401',
      email: 'sales@evangelosommer.com'
    },
    'emergency': {
      name: 'Evangelo Sommer',
      address: '84 Newton Dr., Toronto, ON M2M 2M9',
      phone: '(647) 327-8401',
      email: 'sales@evangelosommer.com'
    }
  };
  
  return serviceContacts[serviceType as keyof typeof serviceContacts] || serviceContacts.creative_development;
}

// Real email service using Resend or Nodemailer
async function sendReceiptEmail(
  clientEmail: string,
  clientName: string,
  receiptData: ReceiptData
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Check if we should use real email or mock
    const USE_REAL_EMAIL = process.env.SENDGRID_API_KEY || process.env.GMAIL_CLIENT_ID || process.env.RESEND_API_KEY || process.env.SMTP_HOST;

    if (USE_REAL_EMAIL && process.env.SENDGRID_API_KEY) {
      // Use SendGrid API for multi-domain email sending
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);

      const emailHtml = generateReceiptEmailHtml(receiptData, clientName);

      // Determine the correct from email based on service type
      const fromEmail = getServiceEmail(receiptData.serviceType);
      const serviceName = getServiceName(receiptData.serviceType);

      const msg = {
        to: clientEmail,
        from: {
          email: fromEmail,
          name: serviceName
        },
        subject: `Receipt ${receiptData.receiptNumber} - Thank you for your business`,
        html: emailHtml,
      };

      const response = await sgMail.send(msg);

      return {
        success: true,
        messageId: response[0].headers['x-message-id'] || 'sendgrid_success'
      };

    } else if (USE_REAL_EMAIL && process.env.GMAIL_CLIENT_ID) {
      
      const oauth2Client = new google.auth.OAuth2(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET,
        'http://localhost:3001/auth/google/callback' // or your redirect URI
      );

      oauth2Client.setCredentials({
        refresh_token: process.env.GMAIL_REFRESH_TOKEN,
      });

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      
      const emailHtml = generateReceiptEmailHtml(receiptData, clientName);
      
      // Determine the correct from email based on service type
      const fromEmail = getServiceEmail(receiptData.serviceType);
      
      // Create the email message
      const message = [
        `From: ${getServiceName(receiptData.serviceType)} <${fromEmail}>`,
        `To: ${clientEmail}`,
        `Subject: Receipt ${receiptData.receiptNumber} - Thank you for your business`,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=utf-8',
        '',
        emailHtml
      ].join('\n');

      const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const result = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
        },
      });

      return {
        success: true,
        messageId: result.data.id || 'gmail_success'
      };
      
    } else if (USE_REAL_EMAIL && process.env.RESEND_API_KEY) {
      // Use Resend for real emails
      const resend = new Resend(process.env.RESEND_API_KEY);
      
      const emailHtml = generateReceiptEmailHtml(receiptData, clientName);
      
      const fromEmail = getServiceEmail(receiptData.serviceType);
      const serviceName = getServiceName(receiptData.serviceType);
      
      const emailResponse = await resend.emails.send({
        from: `${serviceName} <${fromEmail}>`,
        to: clientEmail,
        subject: `Receipt ${receiptData.receiptNumber} - Thank you for your business`,
        html: emailHtml,
      });

      if (emailResponse.error) {
        return {
          success: false,
          error: emailResponse.error.message || 'Email service error'
        };
      }

      return {
        success: true,
        messageId: emailResponse.data?.id || 'resend_success'
      };
      
    } else if (USE_REAL_EMAIL && process.env.SMTP_HOST) {
      // Use Nodemailer for SMTP with service-specific configuration
      const fromEmail = getServiceEmail(receiptData.serviceType);
      const serviceName = getServiceName(receiptData.serviceType);
      const smtpConfig = getServiceSMTPConfig();
      
      // Test if we can send from service-specific email addresses
      const canUseDifferentFromAddress = process.env.ALLOW_DIFFERENT_FROM_ADDRESS === 'true';
      const actualFromEmail = canUseDifferentFromAddress ? fromEmail : smtpConfig.auth.user;
      
      // console.log(`📧 Sending ${receiptData.serviceType} receipt from: ${actualFromEmail} (auth: ${smtpConfig.auth.user})`);
      
      const transporter = nodemailer.createTransport(smtpConfig);

      const emailHtml = generateReceiptEmailHtml(receiptData, clientName);
      
      const mailOptions: SendMailOptions = {
        from: `"${serviceName}" <${actualFromEmail}>`,
        to: clientEmail,
        subject: `Receipt ${receiptData.receiptNumber} - Thank you for your business`,
        html: emailHtml,
      };
      
      // If we're not using different from address, add reply-to
      if (!canUseDifferentFromAddress) {
        mailOptions.replyTo = `"${serviceName}" <${fromEmail}>`;
      }
      
      const info = await transporter.sendMail(mailOptions);

      return {
        success: true,
        messageId: info.messageId
      };
      
    } else {
      // Fall back to mock service for development
      console.log(`📧 MOCK EMAIL (no email service configured):`);
      console.log(`   To: ${clientEmail}`);
      console.log(`   Subject: Receipt ${receiptData.receiptNumber} from Evangelo Sommer`);
      console.log(`   Amount: $${receiptData.totalAmount.toFixed(2)}`);
      console.log(`   Date: ${new Date(receiptData.serviceDate).toLocaleDateString()}`);
      console.log(`   ⚠️ To send real emails, add RESEND_API_KEY or SMTP configuration to .env.local`);
      
      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        success: true,
        messageId: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
    }
  } catch (error) {
    console.error('Email sending error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown email error'
    };
  }
}

// Generate professional HTML email template
function generateReceiptEmailHtml(receiptData: ReceiptData, clientName: string): string {
  const serviceBrand = getServiceBrand(receiptData.serviceType);
  const serviceContact = getServiceContact(receiptData.serviceType);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Receipt ${receiptData.receiptNumber}</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid ${serviceBrand.color}; padding-bottom: 20px; }
            .logo { font-size: 28px; font-weight: bold; color: #2C3E50; text-transform: uppercase; letter-spacing: 2px; }
            .receipt-number { font-size: 18px; color: ${serviceBrand.color}; margin-top: 10px; }
            .details { margin: 30px 0; }
            .detail-row { display: flex; justify-content: space-between; margin-bottom: 10px; }
            .label { font-weight: 600; color: #555; }
            .value { color: #333; }
            .total { font-size: 20px; font-weight: bold; color: ${serviceBrand.color}; border-top: 2px solid #eee; padding-top: 15px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #777; font-size: 14px; }
            .thank-you { background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0; text-align: center; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">${serviceBrand.name}</div>
                <div class="receipt-number">Receipt ${receiptData.receiptNumber}</div>
            </div>
            
            <div class="thank-you">
                <h2 style="margin-top: 0; color: #2C3E50;">Thank you for your business, ${clientName}!</h2>
                <p>This receipt confirms your payment for services provided.</p>
            </div>
            
            <div class="details">
                <div class="detail-row">
                    <span class="label">Service Date:</span>
                    <span class="value">${new Date(receiptData.serviceDate).toLocaleDateString()}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Receipt Number:</span>
                    <span class="value">${receiptData.receiptNumber}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Services:</span>
                    <span class="value">${receiptData.items.map((item: ReceiptItem) => item.description).join(', ')}</span>
                </div>
                <div class="detail-row total">
                    <span class="label">Total Amount:</span>
                    <span class="value">$${receiptData.totalAmount.toFixed(2)}</span>
                </div>
            </div>
            
            <div class="footer">
                <p><strong>${serviceContact.name}</strong><br>
                ${serviceContact.address}<br>
                Phone: ${serviceContact.phone}<br>
                Email: ${serviceContact.email}</p>
                
                <p style="margin-top: 20px; font-size: 12px; color: #999;">
                    This is an automated receipt. Please keep this for your records.
                </p>
            </div>
        </div>
    </body>
    </html>
  `;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ receiptId: string }> }
) {
  try {
    const { receiptId } = await context.params;
    const body = await request.json();
    const { clientEmail, clientName } = body;

    if (!clientEmail || !clientName) {
      return NextResponse.json(
        { success: false, error: 'Client email and name are required' },
        { status: 400 }
      );
    }

    // Get Prisma client
    const prisma = getPrismaClient();
    
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'Database connection failed' },
        { status: 500 }
      );
    }

    // Find the receipt in the Document table (receipts are stored as documents)
    const receiptDocument = await prisma.document.findUnique({
      where: { 
        id: receiptId,
        type: 'RECEIPT'
      },
      include: {
        client: true
      }
    });

    if (!receiptDocument) {
      return NextResponse.json(
        { success: false, error: 'Receipt not found' },
        { status: 404 }
      );
    }

    // Parse receipt data from document content
    const receiptData = typeof receiptDocument.content === 'string' 
      ? JSON.parse(receiptDocument.content) 
      : receiptDocument.content;

    // Update document content to mark email as pending
    const updatedContent = {
      ...receiptData,
      emailStatus: 'pending',
      emailSentAt: new Date().toISOString()
    };

    await prisma.document.update({
      where: { id: receiptId },
      data: {
        content: JSON.stringify(updatedContent),
        updatedAt: new Date()
      }
    });

    // Send email
    const emailResult = await sendReceiptEmail(clientEmail, clientName, {
      receiptNumber: receiptData.receiptNumber || `REC-${receiptId.slice(-6).toUpperCase()}`,
      totalAmount: receiptData.totalAmount || receiptDocument.amount || 0,
      serviceDate: receiptData.serviceDate || receiptDocument.createdAt,
      serviceType: receiptData.serviceType || receiptData.items?.[0]?.serviceType,
      items: receiptData.items || []
    });

    // Update document based on email result - preserve payment status
    const currentStatus = receiptData.status || 'draft';
    const finalContent = {
      ...updatedContent,
      emailStatus: emailResult.success ? 'sent' : 'failed',
      emailSentAt: emailResult.success ? new Date().toISOString() : updatedContent.emailSentAt,
      emailError: emailResult.error || null,
      // Preserve payment status - only update send status
      status: currentStatus === 'paid' ? 'paid' : (emailResult.success ? 'sent' : 'draft')
    };

    const updatedDocument = await prisma.document.update({
      where: { id: receiptId },
      data: {
        content: JSON.stringify(finalContent),
        // Preserve document status if it was already PAID
        status: receiptDocument.status === 'PAID' ? 'PAID' : (emailResult.success ? 'SENT' : receiptDocument.status),
        updatedAt: new Date()
      },
      include: {
        client: true
      }
    });

    // If email was sent successfully, log activity and simulate delivery confirmation
    if (emailResult.success) {
      // Log activity
      try {
        const session = await getServerSession(authOptions);
        await logReceiptSent({
          receiptId,
          receiptNumber: receiptData.receiptNumber || `REC-${receiptId.slice(-6).toUpperCase()}`,
          clientId: updatedDocument.clientId,
          clientName: clientName,
          amount: receiptData.totalAmount || receiptDocument.amount || 0,
          userId: session?.user?.email || undefined,
          userName: session?.user?.name || undefined,
        });
      } catch (logError) {
        console.error('Failed to log receipt sent activity:', logError);
        // Don't fail the request if activity logging fails
      }

      // In a real app, this would be handled by webhooks from your email service
      setTimeout(async () => {
        try {
          const deliveredContent = {
            ...finalContent,
            emailStatus: 'delivered',
            emailDeliveredAt: new Date().toISOString()
          };

          await prisma.document.update({
            where: { id: receiptId },
            data: {
              content: JSON.stringify(deliveredContent),
              updatedAt: new Date()
            }
          });
          console.log(`✅ Receipt ${receiptData.receiptNumber || receiptId} delivery confirmed`);
        } catch (error) {
          console.error('Error updating delivery status:', error);
        }
      }, 3000); // Simulate 3 second delivery confirmation
    }

    return NextResponse.json({
      success: true,
      message: emailResult.success ? 'Email sent successfully' : 'Email failed to send',
      data: {
        id: updatedDocument.id,
        receiptNumber: finalContent.receiptNumber,
        emailStatus: finalContent.emailStatus,
        emailSentAt: finalContent.emailSentAt,
        client: updatedDocument.client
      },
      emailResult
    });

  } catch (error) {
    console.error('Error sending receipt email:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
