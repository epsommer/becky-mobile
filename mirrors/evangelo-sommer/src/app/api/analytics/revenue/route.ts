import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'current'; // current, previous, ytd

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Calculate date ranges
    let startDate: Date;
    let endDate: Date;
    let previousStartDate: Date;
    let previousEndDate: Date;

    if (period === 'ytd') {
      // Year to date
      startDate = new Date(currentYear, 0, 1);
      endDate = now;
      previousStartDate = new Date(currentYear - 1, 0, 1);
      previousEndDate = new Date(currentYear - 1, currentMonth, now.getDate());
    } else if (period === 'previous') {
      // Previous month
      startDate = new Date(currentYear, currentMonth - 1, 1);
      endDate = new Date(currentYear, currentMonth, 0); // Last day of previous month
      previousStartDate = new Date(currentYear - 1, currentMonth - 1, 1);
      previousEndDate = new Date(currentYear - 1, currentMonth, 0);
    } else {
      // Current month
      startDate = new Date(currentYear, currentMonth, 1);
      endDate = now;
      previousStartDate = new Date(currentYear - 1, currentMonth, 1);
      previousEndDate = new Date(currentYear - 1, currentMonth, now.getDate());
    }

    // Get paid billing documents (receipts and invoices)
    const paidDocuments = await prisma.billingDocument.findMany({
      where: {
        status: 'PAID',
        paidAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        amount: true,
        paidAt: true,
        documentType: true,
      },
    });

    // Get paid billing records
    const paidRecords = await prisma.billingRecord.findMany({
      where: {
        status: 'PAID',
        paidDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        amount: true,
        paidDate: true,
      },
    });

    // Calculate total revenue
    const documentRevenue = paidDocuments.reduce((sum, doc) => sum + doc.amount, 0);
    const recordRevenue = paidRecords.reduce((sum, rec) => sum + rec.amount, 0);
    const totalRevenue = documentRevenue + recordRevenue;

    // Get previous period revenue for comparison
    const previousPaidDocuments = await prisma.billingDocument.findMany({
      where: {
        status: 'PAID',
        paidAt: {
          gte: previousStartDate,
          lte: previousEndDate,
        },
      },
      select: {
        amount: true,
      },
    });

    const previousPaidRecords = await prisma.billingRecord.findMany({
      where: {
        status: 'PAID',
        paidDate: {
          gte: previousStartDate,
          lte: previousEndDate,
        },
      },
      select: {
        amount: true,
      },
    });

    const previousDocumentRevenue = previousPaidDocuments.reduce((sum, doc) => sum + doc.amount, 0);
    const previousRecordRevenue = previousPaidRecords.reduce((sum, rec) => sum + rec.amount, 0);
    const previousRevenue = previousDocumentRevenue + previousRecordRevenue;

    // Calculate pipeline value (pending invoices and quotes)
    const pipeline = await prisma.billingDocument.findMany({
      where: {
        status: {
          in: ['SENT', 'ACCEPTED', 'DRAFT'],
        },
        documentType: {
          in: ['INVOICE', 'QUOTE', 'ESTIMATE'],
        },
      },
      select: {
        amount: true,
        documentType: true,
        status: true,
      },
    });

    const pipelineValue = pipeline.reduce((sum, doc) => sum + doc.amount, 0);

    // Calculate breakdown by document type
    const breakdown = {
      receipts: paidDocuments.filter(d => d.documentType === 'RECEIPT').reduce((sum, d) => sum + d.amount, 0),
      invoices: paidDocuments.filter(d => d.documentType === 'INVOICE').reduce((sum, d) => sum + d.amount, 0),
      billingRecords: recordRevenue,
    };

    return NextResponse.json({
      success: true,
      data: {
        totalRevenue,
        previousRevenue,
        pipelineValue,
        breakdown,
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
        comparison: {
          start: previousStartDate.toISOString(),
          end: previousEndDate.toISOString(),
          revenue: previousRevenue,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching revenue analytics:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch revenue analytics',
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
