import { NextRequest, NextResponse } from 'next/server';
import { checkDatabaseHealth } from '@/lib/db-health';
import { testPrismaConnection } from '@/lib/prisma';

export async function GET() {
  try {
    const health = await checkDatabaseHealth(true); // Force fresh check
    
    // Additional Prisma-specific test
    const prismaTest = await testPrismaConnection();
    
    const response = {
      database: {
        status: health.status,
        connected: health.isConnected,
        responseTime: health.responseTime,
        lastCheck: health.lastCheck,
        error: health.error
      },
      prisma: {
        connected: prismaTest,
        clientInitialized: !!health.isConnected
      },
      overall: health.isConnected && prismaTest ? 'healthy' : 'unhealthy'
    };

    const status = response.overall === 'healthy' ? 200 : 503;
    
    return NextResponse.json(response, { status });
    
  } catch (error) {
    return NextResponse.json({
      database: {
        status: 'error',
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      prisma: {
        connected: false,
        clientInitialized: false
      },
      overall: 'unhealthy'
    }, { status: 503 });
  }
}