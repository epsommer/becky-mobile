/**
 * Database health check utilities
 */

import { getPrismaClient } from './prisma';

export interface DatabaseHealth {
  isConnected: boolean;
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  lastCheck: Date;
  error?: string;
}

let lastHealthCheck: DatabaseHealth | null = null;
const HEALTH_CHECK_CACHE_MS = 5000; // Cache health check for 5 seconds

export async function checkDatabaseHealth(forceCheck = false): Promise<DatabaseHealth> {
  // Return cached result if recent and not forced
  if (!forceCheck && lastHealthCheck && 
      (Date.now() - lastHealthCheck.lastCheck.getTime()) < HEALTH_CHECK_CACHE_MS) {
    return lastHealthCheck;
  }

  const startTime = Date.now();
  const prisma = getPrismaClient();

  try {
    if (!prisma) {
      throw new Error('Prisma client not available');
    }

    // Test database connection with a simple query
    await prisma.$queryRaw`SELECT 1`;
    
    const responseTime = Date.now() - startTime;
    
    lastHealthCheck = {
      isConnected: true,
      status: responseTime < 100 ? 'healthy' : 'degraded',
      responseTime,
      lastCheck: new Date()
    };

    return lastHealthCheck;

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    lastHealthCheck = {
      isConnected: false,
      status: 'down',
      responseTime,
      lastCheck: new Date(),
      error: error instanceof Error ? error.message : 'Unknown database error'
    };

    console.error('Database health check failed:', error);
    return lastHealthCheck;
  }
}

export function getDatabaseStatus(): DatabaseHealth | null {
  return lastHealthCheck;
}

export async function ensureDatabaseConnection(): Promise<boolean> {
  const health = await checkDatabaseHealth();
  return health.isConnected;
}

// Graceful database operations with retry logic
export async function withDatabaseRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Check database health before attempting operation
      const isConnected = await ensureDatabaseConnection();
      if (!isConnected && attempt === 1) {
        throw new Error('Database not available');
      }

      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (attempt === maxRetries) {
        break;
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
    }
  }

  throw lastError!;
}