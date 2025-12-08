"use client"

import React, { useState, useEffect } from 'react'
import { Star, Send, CheckCircle, Clock, XCircle, Eye, EyeOff, Award } from 'lucide-react'
import TestimonialRequestModal from './TestimonialRequestModal'

interface Client {
  id: string
  name: string
  email?: string
}

interface Testimonial {
  id: string
  rating: number
  title?: string
  content: string
  status: 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'DRAFT'
  isPublic: boolean
  isFeatured: boolean
  serviceId?: string
  serviceName?: string
  requestSentAt?: string
  submittedAt?: string
  approvedAt?: string
  createdAt: string
}

interface ClientTestimonialsSectionProps {
  clientId: string
  client: Client
}

const ClientTestimonialsSection: React.FC<ClientTestimonialsSectionProps> = ({ clientId, client }) => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showRequestModal, setShowRequestModal] = useState(false)

  useEffect(() => {
    loadTestimonials()
  }, [clientId])

  const loadTestimonials = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/testimonials?clientId=${clientId}`)
      const result = await response.json()

      if (result.success) {
        setTestimonials(result.data || [])
      }
    } catch (error) {
      console.error('Error loading testimonials:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleStatusUpdate = async (testimonialId: string, newStatus: string, updates?: any) => {
    try {
      const response = await fetch(`/api/testimonials/${testimonialId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, ...updates }),
      })

      if (response.ok) {
        loadTestimonials()
      }
    } catch (error) {
      console.error('Error updating testimonial:', error)
    }
  }

  const handleTogglePublic = async (testimonialId: string, currentPublic: boolean) => {
    try {
      const response = await fetch(`/api/testimonials/${testimonialId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: !currentPublic }),
      })

      if (response.ok) {
        loadTestimonials()
      }
    } catch (error) {
      console.error('Error toggling testimonial visibility:', error)
    }
  }

  const handleToggleFeatured = async (testimonialId: string, currentFeatured: boolean) => {
    try {
      const response = await fetch(`/api/testimonials/${testimonialId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFeatured: !currentFeatured }),
      })

      if (response.ok) {
        loadTestimonials()
      }
    } catch (error) {
      console.error('Error toggling testimonial featured status:', error)
    }
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock, label: 'Pending' },
      SUBMITTED: { bg: 'bg-blue-100', text: 'text-blue-800', icon: Send, label: 'Submitted' },
      APPROVED: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle, label: 'Approved' },
      REJECTED: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle, label: 'Rejected' },
      DRAFT: { bg: 'bg-gray-100', text: 'text-gray-800', icon: Clock, label: 'Draft' },
    }

    const badge = badges[status as keyof typeof badges] || badges.PENDING
    const Icon = badge.icon

    return (
      <span className={`neo-badge ${badge.bg} ${badge.text} text-xs uppercase px-2 py-1 flex items-center space-x-1`}>
        <Icon className="h-3 w-3" />
        <span>{badge.label}</span>
      </span>
    )
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (isLoading) {
    return (
      <div className="neo-container transition-transform hover:scale-[1.01]">
        <div className="neo-inset border-b border-foreground/10 p-6">
          <h3 className="text-lg font-bold text-foreground uppercase tracking-wide font-primary">
            Testimonials
          </h3>
        </div>
        <div className="p-6 text-center">
          <div className="w-8 h-8 border-4 border-foreground/20 border-t-transparent animate-spin mx-auto mb-2"></div>
          <p className="text-muted-foreground font-primary text-sm">Loading testimonials...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="neo-container transition-transform hover:scale-[1.01]">
        <div className="neo-inset border-b border-foreground/10 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-foreground uppercase tracking-wide font-primary">
              Testimonials
            </h3>
            <button
              className="neo-button px-2 sm:px-4 py-2 uppercase tracking-wide transition-transform hover:scale-[1.02] text-xs sm:text-sm"
              onClick={() => setShowRequestModal(true)}
              disabled={!client.email}
              title={!client.email ? 'Client email required to send testimonial request' : 'Request testimonial'}
            >
              <Send className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden xs:inline">Request </span>Testimonial
            </button>
          </div>
        </div>

        <div className="p-6">
          {!testimonials || testimonials.length === 0 ? (
            <div className="text-center py-8">
              <Star className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground font-primary mb-4">No testimonials yet</p>
              <button
                className="neo-button px-2 sm:px-4 py-2 uppercase tracking-wide transition-transform hover:scale-[1.02] text-xs sm:text-sm"
                onClick={() => setShowRequestModal(true)}
                disabled={!client.email}
              >
                <span className="hidden xs:inline">Request </span>First Testimonial
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {testimonials.map((testimonial) => (
                <div key={testimonial.id} className="neo-inset p-4 rounded-lg transition-transform hover:scale-[1.01]">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        {renderStars(testimonial.rating)}
                        {getStatusBadge(testimonial.status)}
                        {testimonial.isFeatured && (
                          <span className="neo-badge bg-purple-100 text-purple-800 text-xs uppercase px-2 py-1 flex items-center space-x-1">
                            <Award className="h-3 w-3" />
                            <span>Featured</span>
                          </span>
                        )}
                      </div>
                      {testimonial.title && (
                        <h4 className="font-bold text-foreground font-primary">{testimonial.title}</h4>
                      )}
                      {testimonial.serviceName && (
                        <p className="text-xs text-muted-foreground font-primary">
                          Service: {testimonial.serviceName}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  {testimonial.content && (
                    <p className="text-foreground font-primary mb-3 whitespace-pre-wrap">
                      {testimonial.content}
                    </p>
                  )}

                  {/* Metadata */}
                  <div className="flex items-center justify-between pt-3 border-t border-foreground/10">
                    <div className="text-xs text-muted-foreground font-primary space-y-1">
                      {testimonial.requestSentAt && (
                        <div>Requested: {formatDate(testimonial.requestSentAt)}</div>
                      )}
                      {testimonial.submittedAt && (
                        <div>Submitted: {formatDate(testimonial.submittedAt)}</div>
                      )}
                      {testimonial.approvedAt && (
                        <div>Approved: {formatDate(testimonial.approvedAt)}</div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2">
                      {testimonial.status === 'SUBMITTED' && (
                        <>
                          <button
                            className="neo-button-sm px-3 py-1 text-xs uppercase transition-transform hover:scale-[1.05]"
                            onClick={() => handleStatusUpdate(testimonial.id, 'APPROVED', { isPublic: true })}
                          >
                            Approve
                          </button>
                          <button
                            className="neo-button-sm px-3 py-1 text-xs uppercase transition-transform hover:scale-[1.05] bg-red-100"
                            onClick={() => handleStatusUpdate(testimonial.id, 'REJECTED')}
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {testimonial.status === 'APPROVED' && (
                        <>
                          <button
                            className="neo-button-sm px-2 py-1 transition-transform hover:scale-[1.05]"
                            onClick={() => handleTogglePublic(testimonial.id, testimonial.isPublic)}
                            title={testimonial.isPublic ? 'Make private' : 'Make public'}
                          >
                            {testimonial.isPublic ? (
                              <Eye className="h-4 w-4" />
                            ) : (
                              <EyeOff className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            className="neo-button-sm px-2 py-1 transition-transform hover:scale-[1.05]"
                            onClick={() => handleToggleFeatured(testimonial.id, testimonial.isFeatured)}
                            title={testimonial.isFeatured ? 'Remove from featured' : 'Mark as featured'}
                          >
                            <Award className={`h-4 w-4 ${testimonial.isFeatured ? 'text-purple-600' : ''}`} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <TestimonialRequestModal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        client={client}
        clients={[]}
        onRequestSent={loadTestimonials}
      />
    </>
  )
}

export default ClientTestimonialsSection
