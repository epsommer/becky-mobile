// src/app/api/billing/receipts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { billingManager } from "../../../../lib/billing-manager";
import { CreateReceiptData, Receipt } from "../../../../types/billing";
import { logReceiptCreated } from "../../../../lib/activity-logger";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";

// GET /api/billing/receipts - Get all receipts with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const conversationId = searchParams.get('conversationId');
    const includeArchived = searchParams.get('archived') === 'true';

    console.log('[Receipt API GET] Request params:', { clientId, conversationId, includeArchived });

    let receipts: Receipt[];

    if (clientId) {
      console.log('[Receipt API GET] Fetching receipts for clientId:', clientId);
      receipts = await billingManager.getReceiptsByClientId(clientId);
      console.log('[Receipt API GET] Found', receipts.length, 'receipts for clientId:', clientId);
    } else if (conversationId) {
      receipts = billingManager.getReceiptsByConversationId(conversationId);
    } else {
      // Return all receipts
      receipts = await billingManager.getAllReceipts(includeArchived);
      console.log('[Receipt API GET] Found', receipts.length, 'total receipts');
    }

    return NextResponse.json({
      success: true,
      receipts: receipts
    });
  } catch (error) {
    console.error("[Receipt API GET] Error fetching receipts:", error);
    console.error("[Receipt API GET] Error stack:", (error as Error).stack);
    return NextResponse.json(
      { error: "Failed to fetch receipts" },
      { status: 500 }
    );
  }
}

// POST /api/billing/receipts - Create new receipt
export async function POST(request: NextRequest) {
  try {
    console.log('[Receipt API] Received POST request');
    const receiptData: CreateReceiptData = await request.json();
    console.log('[Receipt API] Request data:', JSON.stringify({
      clientId: receiptData.clientId,
      itemCount: receiptData.items?.length,
      paymentMethod: receiptData.paymentMethod,
      paymentDate: receiptData.paymentDate,
      serviceDate: receiptData.serviceDate
    }));

    // Validate required fields
    if (!receiptData.clientId) {
      console.error('[Receipt API] Validation error: Client ID missing');
      return NextResponse.json(
        { error: "Client ID is required" },
        { status: 400 }
      );
    }

    if (!receiptData.items || receiptData.items.length === 0) {
      console.error('[Receipt API] Validation error: No items provided');
      return NextResponse.json(
        { error: "At least one item is required" },
        { status: 400 }
      );
    }

    if (!receiptData.paymentMethod) {
      console.error('[Receipt API] Validation error: Payment method missing');
      return NextResponse.json(
        { error: "Payment method is required" },
        { status: 400 }
      );
    }

    console.log('[Receipt API] Calling billingManager.createReceipt');
    // Create the receipt
    const receipt = await billingManager.createReceipt(receiptData);
    console.log('[Receipt API] Receipt created successfully:', receipt.id);

    // Log activity
    try {
      const session = await getServerSession(authOptions);
      await logReceiptCreated({
        receiptId: receipt.id,
        receiptNumber: receipt.receiptNumber,
        clientId: receipt.clientId,
        clientName: receipt.client?.name,
        amount: receipt.totalAmount,
        userId: session?.user?.email || undefined,
        userName: session?.user?.name || undefined,
      });
    } catch (logError) {
      console.error('[Receipt API] Failed to log activity:', logError);
      // Don't fail the request if activity logging fails
    }

    return NextResponse.json({
      success: true,
      receipt: receipt,
      message: "Receipt created successfully"
    });
  } catch (error) {
    console.error("[Receipt API] Error creating receipt:", error);
    console.error("[Receipt API] Error stack:", (error as Error).stack);
    return NextResponse.json(
      {
        error: "Failed to create receipt",
        details: (error as Error).message
      },
      { status: 500 }
    );
  }
}
