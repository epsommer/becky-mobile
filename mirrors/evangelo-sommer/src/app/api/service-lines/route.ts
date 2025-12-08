import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const serviceLines = await prisma.serviceLine.findMany({
      orderBy: {
        name: 'asc'
      },
      include: {
        _count: {
          select: {
            serviceContracts: true,
            serviceRecords: true,
            billingRecords: true
          }
        }
      }
    })

    const enhancedServiceLines = serviceLines.map(serviceLine => ({
      id: serviceLine.id,
      name: serviceLine.name,
      route: serviceLine.slug,
      slug: serviceLine.slug,
      description: serviceLine.description,
      color: serviceLine.color,
      isActive: serviceLine.isActive,
      createdAt: serviceLine.createdAt,
      updatedAt: serviceLine.updatedAt,
      metrics: {
        revenue: 0, // TODO: Calculate from billingRecords
        activeClients: serviceLine._count.serviceContracts,
        completionRate: 0 // TODO: Calculate from serviceRecords
      },
      counts: {
        contracts: serviceLine._count.serviceContracts,
        records: serviceLine._count.serviceRecords,
        billing: serviceLine._count.billingRecords
      }
    }))

    return NextResponse.json({ success: true, data: enhancedServiceLines })
  } catch (error) {
    console.error('Error fetching service lines:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, route } = body

    if (!name || !route) {
      return NextResponse.json(
        { success: false, error: 'Name and route are required' },
        { status: 400 }
      )
    }

    const serviceLine = await prisma.serviceLine.create({
      data: {
        name,
        slug: route,
        color: '#3b82f6', // Default blue color
        isActive: true
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        id: serviceLine.id,
        name: serviceLine.name,
        route: serviceLine.slug,
        color: serviceLine.color,
        metrics: {
          revenue: 0,
          activeClients: 0,
          completionRate: 0
        }
      }
    })
  } catch (error) {
    console.error('Error creating service line:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create service line' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Service line ID is required' },
        { status: 400 }
      )
    }

    await prisma.serviceLine.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'Service line deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting service line:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete service line' },
      { status: 500 }
    )
  }
}