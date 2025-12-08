"use client"

import React, { useState, useEffect } from 'react'
import { Star, Award, Clock, CheckCircle, ExternalLink } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Testimonial {
  id: string
  rating: number
  title?: string
  content: string
  status: 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'DRAFT'
  isPublic: boolean
  isFeatured: boolean
  client: {
    name: string
    company?: string
  }
  createdAt: string
}

interface TestimonialsWidgetProps {
  onViewAll?: () => void
}

const TestimonialsWidget: React.FC<TestimonialsWidgetProps> = ({ onViewAll }) => {
  const router = useRouter()
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    submitted: 0,
    approved: 0,
    featured: 0,
  })

  useEffect(() => {
    loadTestimonials()
  }, [])

  const loadTestimonials = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/testimonials')
      const data = await response.json()

      if (data.success) {
        // API returns testimonials in data.data, with fallback to empty array
        const allTestimonials = Array.isArray(data.data) ? data.data : []
        setTestimonials(allTestimonials.slice(0, 3)) // Show only recent 3

        // Calculate stats
        setStats({
          total: allTestimonials.length,
          pending: allTestimonials.filter((t: Testimonial) => t.status === 'PENDING').length,
          submitted: allTestimonials.filter((t: Testimonial) => t.status === 'SUBMITTED').length,
          approved: allTestimonials.filter((t: Testimonial) => t.status === 'APPROVED').length,
          featured: allTestimonials.filter((t: Testimonial) => t.isFeatured).length,
        })
      }
    } catch (error) {
      console.error('Error loading testimonials:', error)
      // Set empty arrays on error to prevent undefined errors
      setTestimonials([])
    } finally {
      setIsLoading(false)
    }
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center space-x-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-3 w-3 ${
              star <= rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
      SUBMITTED: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Submitted' },
      APPROVED: { bg: 'bg-green-100', text: 'text-green-800', label: 'Approved' },
    }

    const badge = badges[status as keyof typeof badges]
    if (!badge) return null

    return (
      <span className={`${badge.bg} ${badge.text} text-[10px] uppercase px-1.5 py-0.5 rounded`}>
        {badge.label}
      </span>
    )
  }

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  return (
    <div className="neo-card flex flex-col w-full h-full">
      <div className="p-6 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">
            Testimonials
          </h3>
          <button
            className="neo-button text-xs px-3 py-1"
            onClick={onViewAll || (() => router.push('/testimonials'))}
          >
            View All
          </button>
        </div>
      </div>

      <div className="p-6 flex-grow flex flex-col">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-foreground/20 border-t-transparent animate-spin rounded-full"></div>
          </div>
        ) : (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="text-center neo-card p-2">
                <div className="text-xl font-bold text-foreground">{stats.total}</div>
                <div className="text-[10px] text-muted-foreground uppercase">Total</div>
              </div>
              <div className="text-center neo-card p-2">
                <div className="text-xl font-bold text-blue-600">{stats.submitted}</div>
                <div className="text-[10px] text-muted-foreground uppercase">To Review</div>
              </div>
              <div className="text-center neo-card p-2">
                <div className="text-xl font-bold text-purple-600">{stats.featured}</div>
                <div className="text-[10px] text-muted-foreground uppercase">Featured</div>
              </div>
            </div>

            {/* Recent Testimonials */}
            {testimonials.length === 0 ? (
              <div className="text-center py-8">
                <Star className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <h4 className="text-sm font-bold text-foreground mb-2">
                  No Testimonials Yet
                </h4>
                <p className="text-xs text-muted-foreground mb-4">
                  Start collecting client testimonials
                </p>
                <button
                  className="neo-button text-xs px-2 sm:px-4 py-2"
                  onClick={() => router.push('/testimonials')}
                >
                  <span className="hidden xs:inline">Request </span>Testimonial
                </button>
              </div>
            ) : (
              <div className="space-y-3 flex-grow">
                <h4 className="text-sm font-semibold text-foreground mb-2">
                  Recent Testimonials
                </h4>
                {testimonials.map((testimonial) => (
                  <div
                    key={testimonial.id}
                    className="neo-card p-3 cursor-pointer transition-all hover:shadow-lg"
                    onClick={() => router.push('/testimonials')}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          {renderStars(testimonial.rating)}
                          {getStatusBadge(testimonial.status)}
                          {testimonial.isFeatured && (
                            <Award className="h-3 w-3 text-purple-600" />
                          )}
                        </div>
                        <div className="text-xs font-bold text-foreground">
                          {testimonial.client.name}
                        </div>
                        {testimonial.client.company && (
                          <div className="text-[10px] text-muted-foreground">
                            {testimonial.client.company}
                          </div>
                        )}
                      </div>
                    </div>
                    {testimonial.title && (
                      <div className="text-xs font-semibold text-foreground mb-1">
                        {truncateText(testimonial.title, 40)}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {truncateText(testimonial.content, 80)}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Quick Actions */}
            {testimonials.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <button
                  className="neo-button w-full text-xs py-2 flex items-center justify-center"
                  onClick={() => router.push('/testimonials')}
                >
                  <ExternalLink className="w-3 h-3 mr-2" />
                  Manage All Testimonials
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default TestimonialsWidget
