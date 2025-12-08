import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '../../../../../lib/prisma';
import { billingManager } from '../../../../../lib/billing-manager';

// GET - Fetch a specific receipt
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ receiptId: string }> }
) {
  try {
    const { receiptId } = await context.params;
    const prisma = getPrismaClient();
    
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'Database connection failed' },
        { status: 500 }
      );
    }

    const document = await prisma.document.findUnique({
      where: { 
        id: receiptId,
        type: 'RECEIPT'
      },
      include: {
        client: true
      }
    });

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Receipt not found' },
        { status: 404 }
      );
    }

    // Transform document to receipt format
    const receiptData = typeof document.content === 'string' ? JSON.parse(document.content) : document.content;
    const receipt = {
      id: document.id,
      receiptNumber: receiptData.receiptNumber || `REC-${document.id.slice(-6).toUpperCase()}`,
      clientId: document.clientId,
      client: {
        id: document.client.participantId,
        name: document.client.name,
        email: document.client.email,
        phone: document.client.phone
      },
      items: receiptData.items || [],
      subtotal: receiptData.subtotal || document.amount || 0,
      taxAmount: receiptData.taxAmount || 0,
      totalAmount: receiptData.totalAmount || document.amount || 0,
      paymentMethod: receiptData.paymentMethod || 'cash',
      paymentDate: receiptData.paymentDate || document.paidDate,
      serviceDate: receiptData.serviceDate || document.createdAt,
      status: receiptData.status === 'paid' ? 'paid' : (receiptData.emailSentAt ? 'sent' : 'draft'),
      emailStatus: receiptData.emailStatus || null,
      emailSentAt: receiptData.emailSentAt ? new Date(receiptData.emailSentAt) : undefined,
      emailDeliveredAt: receiptData.emailDeliveredAt ? new Date(receiptData.emailDeliveredAt) : undefined,
      emailError: receiptData.emailError || undefined,
      notes: receiptData.notes || '',
      createdAt: document.createdAt,
      updatedAt: document.updatedAt
    };

    return NextResponse.json({
      success: true,
      receipt: receipt
    });

  } catch (error) {
    console.error('Error fetching receipt:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// PUT - Update a receipt
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ receiptId: string }> }
) {
  try {
    const { receiptId } = await context.params;
    const receiptData = await request.json();

    // Use billing manager's update method
    const updatedReceipt = await billingManager.updateReceipt(receiptId, receiptData);

    if (!updatedReceipt) {
      return NextResponse.json(
        { success: false, error: 'Receipt not found or could not be updated' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      receipt: updatedReceipt,
      message: 'Receipt updated successfully'
    });

  } catch (error) {
    console.error('Error updating receipt:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}

// PATCH - Update a receipt (same as PUT)
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ receiptId: string }> }
) {
  return PUT(request, context);
}

// DELETE - Delete a receipt
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ receiptId: string }> }
) {
  try {
    const { receiptId } = await context.params;

    // Get Prisma client
    const prisma = getPrismaClient();
    
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'Database connection failed' },
        { status: 500 }
      );
    }

    // Check if receipt exists
    const existingReceipt = await prisma.document.findUnique({
      where: { 
        id: receiptId,
        type: 'RECEIPT'
      }
    });

    if (!existingReceipt) {
      return NextResponse.json(
        { success: false, error: 'Receipt not found' },
        { status: 404 }
      );
    }

    // Delete receipt document
    await prisma.document.delete({
      where: { id: receiptId }
    });

    return NextResponse.json({
      success: true,
      message: 'Receipt deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting receipt:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}