"use client"

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Star, CheckCircle, AlertCircle } from 'lucide-react'

const TestimonialSubmitPage = () => {
  const params = useParams()
  const router = useRouter()
  const [testimonialId] = useState(params.id as string)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [testimonialData, setTestimonialData] = useState<any>(null)

  useEffect(() => {
    // Load testimonial request details (optional - for displaying client info)
    const loadTestimonial = async () => {
      try {
        setIsLoading(true)
        // This would require a public API endpoint to fetch basic testimonial info
        // For now, we'll just set loading to false
        setIsLoading(false)
      } catch (err) {
        console.error('Error loading testimonial:', err)
        setIsLoading(false)
      }
    }

    if (testimonialId) {
      loadTestimonial()
    }
  }, [testimonialId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (rating === 0) {
      setError('Please select a rating')
      return
    }

    if (!content.trim()) {
      setError('Please write your testimonial')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/testimonials/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testimonialId,
          rating,
          title: title.trim(),
          content: content.trim(),
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSuccess(true)
      } else {
        setError(data.error || 'Failed to submit testimonial')
      }
    } catch {
      setError('An error occurred while submitting your testimonial')
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStars = () => {
    return (
      <div className="flex items-center justify-center space-x-2 mb-6">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={`h-10 w-10 ${
                star <= (hoverRating || rating)
                  ? 'text-yellow-500 fill-yellow-500'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-foreground/20 border-t-transparent animate-spin mx-auto mb-4 rounded-full"></div>
          <p className="text-muted-foreground font-primary uppercase tracking-wide">Loading...</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="neo-container max-w-2xl w-full">
          <div className="p-8 text-center">
            <CheckCircle className="h-20 w-20 mx-auto mb-6 text-green-600" />
            <h1 className="text-3xl font-bold text-foreground mb-4 font-primary uppercase">
              Thank You!
            </h1>
            <p className="text-lg text-muted-foreground font-primary mb-6">
              Your testimonial has been submitted successfully and is now under review.
            </p>
            <p className="text-sm text-muted-foreground font-primary">
              We appreciate your feedback and will review it shortly.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="neo-container max-w-2xl w-full">
        {/* Header */}
        <div className="neo-inset border-b border-foreground/10 p-6">
          <h1 className="text-2xl font-bold text-foreground uppercase tracking-wide font-primary text-center">
            Share Your Experience
          </h1>
          <p className="text-center text-muted-foreground font-primary mt-2">
            We&apos;d love to hear about your experience with our services
          </p>
        </div>

        {/* Form */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Rating */}
            <div>
              <label className="block text-sm font-bold text-foreground mb-3 font-primary uppercase tracking-wide text-center">
                How would you rate our service?
              </label>
              {renderStars()}
              {rating > 0 && (
                <p className="text-center text-sm text-muted-foreground font-primary">
                  {rating === 5 && 'Excellent!'}
                  {rating === 4 && 'Very Good'}
                  {rating === 3 && 'Good'}
                  {rating === 2 && 'Fair'}
                  {rating === 1 && 'Needs Improvement'}
                </p>
              )}
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-bold text-foreground mb-2 font-primary uppercase tracking-wide">
                Title (Optional)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Excellent Service!"
                maxLength={100}
                className="neo-input w-full"
              />
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-bold text-foreground mb-2 font-primary uppercase tracking-wide">
                Your Testimonial *
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Tell us about your experience..."
                rows={6}
                required
                className="neo-input w-full resize-none"
              />
              <p className="text-xs text-muted-foreground font-primary mt-1">
                {content.length} characters
              </p>
            </div>

            {/* Error Display */}
            {error && (
              <div className="neo-inset p-3 border-l-4 border-red-500 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <p className="text-sm text-red-600 font-primary">{error}</p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-center pt-4">
              <button
                type="submit"
                disabled={isSubmitting || rating === 0 || !content.trim()}
                className="neo-button px-8 py-3 uppercase tracking-wide transition-transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-foreground/20 border-t-transparent animate-spin rounded-full"></div>
                    <span>Submitting...</span>
                  </div>
                ) : (
                  'Submit Testimonial'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default TestimonialSubmitPage
