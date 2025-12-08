import { NextRequest, NextResponse } from 'next/server';
import { billingManager } from '../../../../../../lib/billing-manager';
import { getPrismaClient } from '../../../../../../lib/prisma';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ receiptId: string }> }
) {
  try {
    const { receiptId } = await context.params;

    // Fetch the receipt using billingManager
    const receipt = await billingManager.getReceiptById(receiptId);

    if (!receipt) {
      return NextResponse.json({ message: 'Receipt not found' }, { status: 404 });
    }

    // Check if receipt has already been sent
    if (receipt.status === 'sent') {
      return NextResponse.json(
        { message: 'This receipt has already been sent' },
        { status: 400 }
      );
    }

    // Get client info using Prisma directly
    const prisma = getPrismaClient();
    if (!prisma) {
      return NextResponse.json({ message: 'Database connection failed' }, { status: 500 });
    }

    const client = await prisma.clientRecord.findFirst({
      where: { participantId: receipt.clientId }
    });

    if (!client) {
      return NextResponse.json({ message: 'Client not found' }, { status: 404 });
    }

    // In a real application, this is where you would:
    // 1. Generate the receipt PDF
    // 2. Send the email with PDF attachment
    // 3. Update the receipt status and email tracking fields
    
    // For now, we'll simulate sending the email and update the status
    const now = new Date();
    const updatedReceipt = {
      ...receipt,
      status: 'sent' as const,
      emailSentAt: now,
      emailStatus: 'sent' as const,
      updatedAt: now
    };

    // Update the receipt using billingManager
    const savedReceipt = await billingManager.updateReceipt(receiptId, updatedReceipt);

    // Log the email sending action
    console.log(`Receipt ${receipt.receiptNumber || receiptId} sent to ${client.name} (${client.email})`);

    // In a real application, you would integrate with an email service like:
    // - SendGrid
    // - AWS SES
    // - Nodemailer with SMTP
    // - Resend
    // 
    // Example email content structure:
    const emailContent = {
      to: client.email || 'unknown@email.com',
      subject: `Receipt ${receipt.receiptNumber || receiptId} from Evangelo Sommer`,
      text: `Dear ${client.name || 'Valued Customer'},\n\nPlease find attached your receipt for services provided.\n\nThank you for your business!\n\nBest regards,\nEvangelo Sommer`,
      html: `
        <h2>Receipt from Evangelo Sommer</h2>
        <p>Dear ${client.name || 'Valued Customer'},</p>
        <p>Please find attached your receipt for services provided.</p>
        <p>Receipt Number: ${receipt.receiptNumber || receiptId}</p>
        <p>Amount: $${receipt.totalAmount || 0}</p>
        <p>Service Date: ${receipt.serviceDate ? new Date(receipt.serviceDate).toLocaleDateString() : 'N/A'}</p>
        <p>Thank you for your business!</p>
        <p>Best regards,<br/>Evangelo Sommer</p>
      `,
      // attachment: receiptPDF
    };

    console.log('Email would be sent with content:', emailContent);

    return NextResponse.json({
      success: true,
      message: 'Receipt sent successfully',
      receipt: savedReceipt,
      emailDetails: {
        sentTo: client.email,
        sentAt: now.toISOString(),
        subject: emailContent.subject
      }
    });

  } catch (error) {
    console.error('Error sending receipt:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}