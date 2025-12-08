import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if prisma client is available
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'Database connection not available' },
        { status: 503 }
      );
    }

    // Fetch all households with member count
    const households = await prisma.household.findMany({
      select: {
        id: true,
        name: true,
        accountType: true,
        _count: {
          select: {
            members: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Transform the data to include memberCount
    const transformedHouseholds = households.map(household => ({
      id: household.id,
      name: household.name,
      accountType: household.accountType,
      memberCount: household._count.members
    }));

    return NextResponse.json({
      success: true,
      data: transformedHouseholds
    });
  } catch (error) {
    console.error('Error fetching households:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch households' },
      { status: 500 }
    );
  }
}
