import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET /api/testimonials/[id] - Get a specific testimonial
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const testimonial = await prisma!.testimonial.findUnique({
      where: { id },
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

    if (!testimonial) {
      return NextResponse.json(
        { error: 'Testimonial not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      testimonial,
    })
  } catch (error) {
    console.error('Error fetching testimonial:', error)
    return NextResponse.json(
      { error: 'Failed to fetch testimonial' },
      { status: 500 }
    )
  }
}

// PATCH /api/testimonials/[id] - Update a testimonial
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const {
      rating,
      title,
      content,
      status,
      isPublic,
      isFeatured,
      serviceId,
      serviceName,
    } = body

    // Validate rating if provided
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    const updateData: any = {}

    if (rating !== undefined) updateData.rating = rating
    if (title !== undefined) updateData.title = title
    if (content !== undefined) updateData.content = content
    if (status !== undefined) updateData.status = status
    if (isPublic !== undefined) updateData.isPublic = isPublic
    if (isFeatured !== undefined) updateData.isFeatured = isFeatured
    if (serviceId !== undefined) updateData.serviceId = serviceId
    if (serviceName !== undefined) updateData.serviceName = serviceName

    // Update timestamps based on status changes
    if (status === 'SUBMITTED' && !updateData.submittedAt) {
      updateData.submittedAt = new Date()
    }
    if (status === 'APPROVED' && !updateData.approvedAt) {
      updateData.approvedAt = new Date()
    }

    const testimonial = await prisma!.testimonial.update({
      where: { id },
      data: updateData,
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
    console.error('Error updating testimonial:', error)
    return NextResponse.json(
      { error: 'Failed to update testimonial' },
      { status: 500 }
    )
  }
}

// DELETE /api/testimonials/[id] - Delete a testimonial
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    await prisma!.testimonial.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Testimonial deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting testimonial:', error)
    return NextResponse.json(
      { error: 'Failed to delete testimonial' },
      { status: 500 }
    )
  }
}
