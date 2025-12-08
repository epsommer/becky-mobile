import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Date ranges for YTD comparison
    const ytdStart = new Date(currentYear, 0, 1);
    const ytdEnd = now;
    const previousYtdStart = new Date(currentYear - 1, 0, 1);
    const previousYtdEnd = new Date(currentYear - 1, currentMonth, now.getDate());

    // Fetch all data in parallel
    const [
      currentPaidDocuments,
      currentPaidRecords,
      previousPaidDocuments,
      previousPaidRecords,
      pipelineDocuments,
      allClients,
      previousClients,
    ] = await Promise.all([
      // Current YTD paid documents
      prisma.billingDocument.findMany({
        where: {
          status: 'PAID',
          paidAt: { gte: ytdStart, lte: ytdEnd },
        },
        select: { amount: true },
      }),
      // Current YTD paid records
      prisma.billingRecord.findMany({
        where: {
          status: 'PAID',
          paidDate: { gte: ytdStart, lte: ytdEnd },
        },
        select: { amount: true },
      }),
      // Previous YTD paid documents
      prisma.billingDocument.findMany({
        where: {
          status: 'PAID',
          paidAt: { gte: previousYtdStart, lte: previousYtdEnd },
        },
        select: { amount: true },
      }),
      // Previous YTD paid records
      prisma.billingRecord.findMany({
        where: {
          status: 'PAID',
          paidDate: { gte: previousYtdStart, lte: previousYtdEnd },
        },
        select: { amount: true },
      }),
      // Pipeline (pending invoices, quotes, estimates)
      prisma.billingDocument.findMany({
        where: {
          status: { in: ['SENT', 'ACCEPTED', 'DRAFT'] },
          documentType: { in: ['INVOICE', 'QUOTE', 'ESTIMATE'] },
        },
        select: { amount: true },
      }),
      // All current clients
      prisma.clientRecord.findMany({
        select: {
          id: true,
          status: true,
          createdAt: true,
        },
      }),
      // Previous year client count
      prisma.clientRecord.count({
        where: {
          createdAt: { lte: previousYtdEnd },
        },
      }),
    ]);

    // Calculate revenue
    const currentRevenue =
      currentPaidDocuments.reduce((sum, doc) => sum + doc.amount, 0) +
      currentPaidRecords.reduce((sum, rec) => sum + rec.amount, 0);

    const previousRevenue =
      previousPaidDocuments.reduce((sum, doc) => sum + doc.amount, 0) +
      previousPaidRecords.reduce((sum, rec) => sum + rec.amount, 0);

    const pipelineValue = pipelineDocuments.reduce((sum, doc) => sum + doc.amount, 0);

    // Calculate client metrics
    const totalClients = allClients.length;
    const activeClients = allClients.filter(c => c.status === 'ACTIVE').length;
    const prospects = allClients.filter(c => c.status === 'PROSPECT').length;

    // Calculate growth rate
    const revenueGrowth = previousRevenue > 0
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
      : currentRevenue > 0 ? 100 : 0;

    const clientGrowth = previousClients > 0
      ? ((totalClients - previousClients) / previousClients) * 100
      : totalClients > 0 ? 100 : 0;

    // Weighted average growth (70% revenue, 30% clients)
    const growthRate = (revenueGrowth * 0.7) + (clientGrowth * 0.3);

    return NextResponse.json({
      success: true,
      data: {
        revenue: {
          total: currentRevenue,
          previous: previousRevenue,
          pipeline: pipelineValue,
          growth: revenueGrowth,
        },
        clients: {
          total: totalClients,
          active: activeClients,
          prospects: prospects,
          previous: previousClients,
          growth: clientGrowth,
        },
        growth: {
          rate: growthRate,
          revenueGrowth,
          clientGrowth,
        },
        period: {
          current: {
            start: ytdStart.toISOString(),
            end: ytdEnd.toISOString(),
          },
          previous: {
            start: previousYtdStart.toISOString(),
            end: previousYtdEnd.toISOString(),
          },
        },
      },
    });
  } catch (error) {
    console.error('Error fetching analytics metrics:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch analytics metrics',
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
