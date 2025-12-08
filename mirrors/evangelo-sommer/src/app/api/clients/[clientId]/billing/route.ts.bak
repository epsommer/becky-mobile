import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params

    // Fetch client with all related data
    const client = await prisma.clientRecord.findUnique({
      where: { id: clientId },
      include: {
        serviceContracts: {
          include: {
            serviceLine: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        serviceHistory: {
          include: {
            serviceLine: true
          },
          orderBy: {
            serviceDate: 'desc'
          }
        },
        billingRecords: {
          include: {
            serviceLine: true
          },
          orderBy: {
            billingDate: 'desc'
          }
        },
        participant: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            company: true
          }
        }
      }
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // Transform the data to match the component interface
    const transformedClient = {
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      company: client.company,
      status: client.status,
      serviceContracts: client.serviceContracts.map(contract => ({
        id: contract.id,
        serviceLineId: contract.serviceLineId,
        serviceLine: contract.serviceLine,
        serviceName: contract.serviceName,
        serviceCategory: contract.serviceCategory,
        status: contract.status,
        period: contract.period,
        contractValue: contract.contractValue,
        frequency: contract.frequency,
        notes: contract.notes,
        isActive: contract.isActive,
        isPrimary: contract.isPrimary,
        billingDetails: contract.billingDetails,
        seasonalInfo: contract.seasonalInfo
      })),
      serviceRecords: client.serviceHistory.map(record => ({
        id: record.id,
        serviceLineId: record.serviceLineId,
        serviceLine: record.serviceLine,
        serviceDate: record.serviceDate.toISOString(),
        serviceType: record.serviceType,
        serviceArea: record.serviceArea,
        completionStatus: record.completionStatus,
        notes: record.notes,
        amount: record.amount,
        billingAmount: record.billingAmount,
        billingStatus: record.billingStatus
      })),
      billingRecords: client.billingRecords.map(billing => ({
        id: billing.id,
        serviceLineId: billing.serviceLineId,
        serviceLine: billing.serviceLine,
        invoiceNumber: billing.invoiceNumber,
        amount: billing.amount,
        currency: billing.currency,
        billingPeriod: billing.billingPeriod,
        billingDate: billing.billingDate.toISOString(),
        dueDate: billing.dueDate?.toISOString(),
        paidDate: billing.paidDate?.toISOString(),
        status: billing.status,
        description: billing.description,
        metadata: billing.metadata
      }))
    }

    return NextResponse.json(transformedClient)
  } catch (error) {
    console.error('Error fetching client services and billing:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params
    const updates = await request.json()

    const updatedClient = await prisma.clientRecord.update({
      where: { id: clientId },
      data: {
        ...updates,
        updatedAt: new Date()
      },
      include: {
        serviceContracts: {
          include: {
            serviceLine: true
          }
        },
        serviceHistory: {
          include: {
            serviceLine: true
          }
        },
        billingRecords: {
          include: {
            serviceLine: true
          }
        }
      }
    })

    return NextResponse.json(updatedClient)
  } catch (error) {
    console.error('Error updating client:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Add endpoints for service line operations
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params
    const { type, data } = await request.json()

    let result

    switch (type) {
      case 'service_contract':
        result = await prisma.clientServiceContract.create({
          data: {
            clientId,
            ...data
          },
          include: {
            serviceLine: true
          }
        })
        break

      case 'service_record':
        result = await prisma.serviceRecord.create({
          data: {
            clientId,
            ...data,
            serviceDate: new Date(data.serviceDate)
          },
          include: {
            serviceLine: true
          }
        })
        break

      case 'billing_record':
        result = await prisma.billingRecord.create({
          data: {
            clientId,
            ...data,
            billingDate: new Date(data.billingDate),
            dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
            paidDate: data.paidDate ? new Date(data.paidDate) : undefined
          },
          include: {
            serviceLine: true
          }
        })
        break

      default:
        return NextResponse.json(
          { error: 'Invalid type specified' },
          { status: 400 }
        )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error creating record:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}