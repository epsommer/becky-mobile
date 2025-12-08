import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET /api/testimonials - Get testimonials with optional filtering
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const status = searchParams.get('status')
    const isPublic = searchParams.get('isPublic')

    const whereClause: any = {}

    if (clientId) {
      whereClause.clientId = clientId
    }

    if (status) {
      whereClause.status = status
    }

    if (isPublic !== null && isPublic !== undefined) {
      whereClause.isPublic = isPublic === 'true'
    }

    const testimonials = await prisma!.testimonial.findMany({
      where: whereClause,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({
      success: true,
      data: testimonials,
    })
  } catch (error) {
    console.error('Error fetching testimonials:', error)
    return NextResponse.json(
      { error: 'Failed to fetch testimonials' },
      { status: 500 }
    )
  }
}

// POST /api/testimonials - Create a new testimonial (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      clientId,
      serviceId,
      serviceName,
      rating,
      title,
      content,
      status,
      isPublic,
      isFeatured,
      source,
    } = body

    // Validate required fields
    if (!clientId || !content || rating === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: clientId, content, rating' },
        { status: 400 }
      )
    }

    // Validate rating range
    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    const testimonial = await prisma!.testimonial.create({
      data: {
        clientId,
        serviceId,
        serviceName,
        rating,
        title,
        content,
        status: status || 'PENDING',
        isPublic: isPublic || false,
        isFeatured: isFeatured || false,
        source: source || 'manual',
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      testimonial,
    })
  } catch (error) {
    console.error('Error creating testimonial:', error)
    return NextResponse.json(
      { error: 'Failed to create testimonial' },
      { status: 500 }
    )
  }
}
