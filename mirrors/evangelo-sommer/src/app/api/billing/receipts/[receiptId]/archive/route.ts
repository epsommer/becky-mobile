import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '../../../../../../lib/prisma';

// POST - Archive a receipt
export async function POST(
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

    // Check if receipt exists and is not already archived
    const existingReceipt = await prisma.document.findUnique({
      where: { 
        id: receiptId,
        type: 'RECEIPT'
      },
      include: {
        client: true
      }
    });

    if (!existingReceipt) {
      return NextResponse.json(
        { success: false, error: 'Receipt not found' },
        { status: 404 }
      );
    }

    // Parse existing content to check current status
    const receiptData = typeof existingReceipt.content === 'string' 
      ? JSON.parse(existingReceipt.content) 
      : existingReceipt.content;

    if (receiptData.archived) {
      return NextResponse.json(
        { success: false, error: 'Receipt is already archived' },
        { status: 400 }
      );
    }

    // Update receipt to archived status
    const updatedContent = {
      ...receiptData,
      archived: true,
      archivedAt: new Date().toISOString(),
      archivedReason: 'Moved to archive for later review'
    };

    const updatedReceipt = await prisma.document.update({
      where: { id: receiptId },
      data: {
        content: JSON.stringify(updatedContent),
        updatedAt: new Date()
      },
      include: {
        client: true
      }
    });

    // Transform document to receipt format
    const updatedReceiptData = typeof updatedReceipt.content === 'string' 
      ? JSON.parse(updatedReceipt.content) 
      : updatedReceipt.content;

    const receipt = {
      id: updatedReceipt.id,
      receiptNumber: updatedReceiptData.receiptNumber || `REC-${updatedReceipt.id.slice(-6).toUpperCase()}`,
      clientId: updatedReceipt.clientId,
      client: {
        id: updatedReceipt.client.participantId,
        name: updatedReceipt.client.name,
        email: updatedReceipt.client.email,
        phone: updatedReceipt.client.phone
      },
      items: updatedReceiptData.items || [],
      subtotal: updatedReceiptData.subtotal || updatedReceipt.amount || 0,
      taxAmount: updatedReceiptData.taxAmount || 0,
      totalAmount: updatedReceiptData.totalAmount || updatedReceipt.amount || 0,
      paymentMethod: updatedReceiptData.paymentMethod || 'cash',
      paymentDate: updatedReceiptData.paymentDate || updatedReceipt.paidDate,
      serviceDate: updatedReceiptData.serviceDate || updatedReceipt.createdAt,
      status: updatedReceiptData.status === 'paid' ? 'paid' : (updatedReceiptData.status === 'sent' ? 'sent' : 'draft'),
      notes: updatedReceiptData.notes || '',
      archived: updatedReceiptData.archived || false,
      archivedAt: updatedReceiptData.archivedAt,
      createdAt: updatedReceipt.createdAt,
      updatedAt: updatedReceipt.updatedAt
    };

    return NextResponse.json({
      success: true,
      receipt: receipt,
      message: 'Receipt archived successfully'
    });

  } catch (error) {
    console.error('Error archiving receipt:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// DELETE - Unarchive a receipt
export async function DELETE(
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

    // Check if receipt exists and is archived
    const existingReceipt = await prisma.document.findUnique({
      where: { 
        id: receiptId,
        type: 'RECEIPT'
      },
      include: {
        client: true
      }
    });

    if (!existingReceipt) {
      return NextResponse.json(
        { success: false, error: 'Receipt not found' },
        { status: 404 }
      );
    }

    // Parse existing content to check current status
    const receiptData = typeof existingReceipt.content === 'string' 
      ? JSON.parse(existingReceipt.content) 
      : existingReceipt.content;

    if (!receiptData.archived) {
      return NextResponse.json(
        { success: false, error: 'Receipt is not archived' },
        { status: 400 }
      );
    }

    // Update receipt to unarchive
    const updatedContent = {
      ...receiptData,
      archived: false,
      unarchivedAt: new Date().toISOString()
    };
    delete updatedContent.archivedAt;
    delete updatedContent.archivedReason;

    await prisma.document.update({
      where: { id: receiptId },
      data: {
        content: JSON.stringify(updatedContent),
        updatedAt: new Date()
      },
      include: {
        client: true
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Receipt unarchived successfully'
    });

  } catch (error) {
    console.error('Error unarchiving receipt:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}