import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Current year-to-date
    const ytdStart = new Date(currentYear, 0, 1);
    const ytdEnd = now;

    // Previous year same period
    const previousYtdStart = new Date(currentYear - 1, 0, 1);
    const previousYtdEnd = new Date(currentYear - 1, currentMonth, now.getDate());

    // Get current YTD revenue
    const [currentDocuments, currentRecords] = await Promise.all([
      prisma.billingDocument.findMany({
        where: {
          status: 'PAID',
          paidAt: { gte: ytdStart, lte: ytdEnd },
        },
        select: { amount: true },
      }),
      prisma.billingRecord.findMany({
        where: {
          status: 'PAID',
          paidDate: { gte: ytdStart, lte: ytdEnd },
        },
        select: { amount: true },
      }),
    ]);

    const currentRevenue =
      currentDocuments.reduce((sum, doc) => sum + doc.amount, 0) +
      currentRecords.reduce((sum, rec) => sum + rec.amount, 0);

    // Get previous YTD revenue
    const [previousDocuments, previousRecords] = await Promise.all([
      prisma.billingDocument.findMany({
        where: {
          status: 'PAID',
          paidAt: { gte: previousYtdStart, lte: previousYtdEnd },
        },
        select: { amount: true },
      }),
      prisma.billingRecord.findMany({
        where: {
          status: 'PAID',
          paidDate: { gte: previousYtdStart, lte: previousYtdEnd },
        },
        select: { amount: true },
      }),
    ]);

    const previousRevenue =
      previousDocuments.reduce((sum, doc) => sum + doc.amount, 0) +
      previousRecords.reduce((sum, rec) => sum + rec.amount, 0);

    // Get current client count
    const currentClients = await prisma.clientRecord.count({
      where: {
        createdAt: { lte: ytdEnd },
      },
    });

    // Get previous year client count
    const previousClients = await prisma.clientRecord.count({
      where: {
        createdAt: { lte: previousYtdEnd },
      },
    });

    // Calculate growth rates
    const revenueGrowth = previousRevenue > 0
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
      : currentRevenue > 0 ? 100 : 0;

    const clientGrowth = previousClients > 0
      ? ((currentClients - previousClients) / previousClients) * 100
      : currentClients > 0 ? 100 : 0;

    // Calculate average growth rate (weighted towards revenue)
    const averageGrowth = (revenueGrowth * 0.7) + (clientGrowth * 0.3);

    return NextResponse.json({
      success: true,
      data: {
        growthRate: averageGrowth,
        revenueGrowth,
        clientGrowth,
        current: {
          revenue: currentRevenue,
          clients: currentClients,
          period: {
            start: ytdStart.toISOString(),
            end: ytdEnd.toISOString(),
          },
        },
        previous: {
          revenue: previousRevenue,
          clients: previousClients,
          period: {
            start: previousYtdStart.toISOString(),
            end: previousYtdEnd.toISOString(),
          },
        },
      },
    });
  } catch (error) {
    console.error('Error calculating growth rate:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to calculate growth rate',
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
