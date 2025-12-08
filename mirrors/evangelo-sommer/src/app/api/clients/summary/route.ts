import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    // Get all clients with their related data counts and totals
    const clients = await prisma.clientRecord.findMany({
      include: {
        serviceContracts: {
          select: {
            id: true
          }
        },
        serviceHistory: {
          select: {
            id: true
          }
        },
        billingRecords: {
          select: {
            id: true,
            amount: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Transform the data to include counts and totals
    const transformedClients = clients.map(client => ({
      id: client.id,
      name: client.name,
      email: client.email || '',
      phone: client.phone || '',
      serviceContracts: client.serviceContracts.length,
      serviceRecords: client.serviceHistory.length,
      billingRecords: client.billingRecords.length,
      totalBilled: client.billingRecords.reduce((sum, billing) => sum + billing.amount, 0)
    }))

    return NextResponse.json(transformedClients)
  } catch (error) {
    console.error('Error fetching clients summary:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}