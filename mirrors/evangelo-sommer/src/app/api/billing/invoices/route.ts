// src/app/api/billing/invoices/route.ts
import { NextRequest, NextResponse } from "next/server";
import { billingManager } from "../../../../lib/billing-manager";
import { CreateInvoiceData, Invoice } from "../../../../types/billing";

// GET /api/billing/invoices - Get all invoices with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const conversationId = searchParams.get('conversationId');
    
    let invoices: Invoice[];
    
    if (clientId) {
      invoices = billingManager.getInvoicesByClientId(clientId);
    } else if (conversationId) {
      invoices = billingManager.getInvoicesByConversationId(conversationId);
    } else {
      // Return all invoices (in a real implementation, you'd want pagination)
      invoices = [];
    }

    return NextResponse.json({
      success: true,
      invoices: invoices
    });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}

// POST /api/billing/invoices - Create new invoice
export async function POST(request: NextRequest) {
  try {
    const invoiceData: CreateInvoiceData = await request.json();

    // Validate required fields
    if (!invoiceData.clientId) {
      return NextResponse.json(
        { error: "Client ID is required" },
        { status: 400 }
      );
    }

    if (!invoiceData.items || invoiceData.items.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required" },
        { status: 400 }
      );
    }

    // Create the invoice
    const invoice = await billingManager.createInvoice(invoiceData);

    return NextResponse.json({
      success: true,
      invoice: invoice,
      message: "Invoice created successfully"
    });
  } catch (error) {
    console.error("Error creating invoice:", error);
    return NextResponse.json(
      { 
        error: "Failed to create invoice", 
        details: (error as Error).message 
      },
      { status: 500 }
    );
  }
}
