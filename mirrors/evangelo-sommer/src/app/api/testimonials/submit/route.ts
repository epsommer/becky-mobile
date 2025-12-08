import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { logTestimonialReceived } from '@/lib/activity-logger'

// Allowed origins for CORS (service websites)
const ALLOWED_ORIGINS = [
  'https://woodgreenlandscaping.com',
  'https://www.woodgreenlandscaping.com',
  'https://whiteknightsnow.com',
  'https://www.whiteknightsnow.com',
  'https://pupawalk.com',
  'https://www.pupawalk.com',
  'https://evangelosommer.com',
  'https://www.evangelosommer.com',
  'http://localhost:3000', // Local development
  'http://localhost:3001',
  'http://localhost:3002',
]

// POST /api/testimonials/submit - Public endpoint for clients to submit testimonials
export async function POST(request: NextRequest) {
  // Handle CORS
  const origin = request.headers.get('origin')
  const corsHeaders: Record<string, string> = {}

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    corsHeaders['Access-Control-Allow-Origin'] = origin
    corsHeaders['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
    corsHeaders['Access-Control-Allow-Headers'] = 'Content-Type'
  }

  try {
    const body = await request.json()
    const { testimonialId, rating, title, content } = body

    // Validate required fields
    if (!testimonialId || !content || rating === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: testimonialId, content, rating' },
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

    // Find the testimonial request
    const existingTestimonial = await prisma!.testimonial.findUnique({
      where: { id: testimonialId },
    })

    if (!existingTestimonial) {
      return NextResponse.json(
        { error: 'Testimonial request not found' },
        { status: 404 }
      )
    }

    // Check if already submitted
    if (existingTestimonial.status !== 'PENDING' && existingTestimonial.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'This testimonial has already been submitted' },
        { status: 400 }
      )
    }

    // Update the testimonial with client's submission
    const testimonial = await prisma!.testimonial.update({
      where: { id: testimonialId },
      data: {
        rating,
        title,
        content,
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
      include: {
        client: true,
      },
    })

    // Log activity for received testimonial
    try {
      await logTestimonialReceived({
        testimonialId: testimonial.id,
        clientId: testimonial.clientId,
        clientName: testimonial.client?.name || 'Unknown Client',
        rating: testimonial.rating,
      });
    } catch (logError) {
      console.error('Failed to log testimonial received activity:', logError);
      // Don't fail the request if activity logging fails
    }

    return NextResponse.json({
      success: true,
      message: 'Thank you for your testimonial! It has been submitted for review.',
      testimonial: {
        id: testimonial.id,
        status: testimonial.status,
        submittedAt: testimonial.submittedAt,
      },
    }, { headers: corsHeaders })
  } catch (error) {
    console.error('Error submitting testimonial:', error)
    return NextResponse.json(
      { error: 'Failed to submit testimonial' },
      { status: 500, headers: corsHeaders }
    )
  }
}

// OPTIONS handler for CORS preflight
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    })
  }

  return new NextResponse(null, { status: 204 })
}
