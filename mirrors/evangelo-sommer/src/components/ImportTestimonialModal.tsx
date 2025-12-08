"use client"

import React, { useState, useEffect } from 'react'
import { X, Star, Upload, CheckCircle, AlertCircle, Search, Download } from 'lucide-react'
import { lockScroll, unlockScroll } from '@/lib/modal-scroll-lock'
import { logTestimonialReceived } from '@/lib/activity-logger-client'

interface Client {
  id: string
  name: string
  email?: string
  company?: string
}

interface ImportTestimonialModalProps {
  isOpen: boolean
  onClose: () => void
  clients: Client[]
  onImported: () => void
}

const ImportTestimonialModal: React.FC<ImportTestimonialModalProps> = ({
  isOpen,
  onClose,
  clients,
  onImported,
}) => {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [clientSearchQuery, setClientSearchQuery] = useState('')
  const [rating, setRating] = useState(5)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [serviceName, setServiceName] = useState('')
  const [dateReceived, setDateReceived] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const containerRef = React.useRef<HTMLDivElement | null>(null)

  // Disable body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      lockScroll()
      // Set today's date as default
      const today = new Date().toISOString().split('T')[0]
      setDateReceived(today)
      // Reset scroll to top on open
      requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = 0
        }
      })
    } else {
      unlockScroll()
    }

    return () => {
      unlockScroll()
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (!selectedClient) {
      setError('Please select a client')
      return
    }

    if (!content.trim()) {
      setError('Please enter the testimonial content')
      return
    }

    setIsSubmitting(true)

    try {
      // Create the testimonial
      const response = await fetch('/api/testimonials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClient.id,
          serviceName: serviceName.trim() || undefined,
          rating,
          title: title.trim() || undefined,
          content: content.trim(),
          status: 'SUBMITTED',
          isPublic: false,
          isFeatured: false,
          source: 'imported',
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSuccess(true)

        // Log activity
        try {
          await logTestimonialReceived({
            testimonialId: data.testimonial.id,
            clientId: selectedClient.id,
            clientName: selectedClient.name,
            rating,
            source: 'imported',
          })
        } catch (logError) {
          console.error('Failed to log testimonial import:', logError)
          // Don't block the user flow if logging fails
        }

        onImported()

        // Reset form and close after 2 seconds
        setTimeout(() => {
          handleClose()
        }, 2000)
      } else {
        setError(data.error || 'Failed to import testimonial')
      }
    } catch (err) {
      console.error('Import error:', err)
      setError('An error occurred while importing the testimonial')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedClient(null)
      setClientSearchQuery('')
      setRating(5)
      setTitle('')
      setContent('')
      setServiceName('')
      setDateReceived('')
      setError('')
      setSuccess(false)
      onClose()
    }
  }

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
    c.company?.toLowerCase().includes(clientSearchQuery.toLowerCase())
  )

  const renderStarSelector = () => {
    return (
      <div className="flex items-center space-x-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={`h-8 w-8 ${
                star <= rating
                  ? 'text-yellow-500 fill-yellow-500'
                  : 'text-gray-300 hover:text-yellow-300'
              }`}
            />
          </button>
        ))}
        <span className="ml-2 text-sm font-bold text-foreground font-primary">
          {rating} / 5
        </span>
      </div>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-[100]" onClick={handleClose} />

      {/* Modal container - accounts for sidebar on desktop */}
      <div className="fixed inset-y-0 right-0 left-0 lg:left-64 z-[101] flex items-start justify-center p-4 sm:p-6 md:p-8 overflow-y-auto pointer-events-none">
        <div
          ref={containerRef}
          className="neo-container max-w-2xl w-full max-h-[calc(100vh-8rem)] sm:max-h-[calc(100vh-12rem)] md:max-h-[calc(100vh-16rem)] mt-16 sm:mt-20 md:mt-16 mb-8 overflow-y-auto pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="neo-inset border-b border-foreground/10 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Download className="h-6 w-6 text-foreground" />
                <h2 className="text-xl font-bold text-foreground uppercase tracking-wide font-primary">
                  Import Testimonial
                </h2>
              </div>
              <button
                onClick={handleClose}
                disabled={isSubmitting}
                className="neo-icon-button transition-transform hover:scale-[1.1]"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {success ? (
              <div className="text-center py-8">
                <div className="neo-inset p-6">
                  <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-600" />
                  <h3 className="text-lg font-bold text-foreground mb-2 font-primary">
                    Testimonial Imported Successfully!
                  </h3>
                  <p className="text-muted-foreground font-primary">
                    The testimonial from {selectedClient?.name} has been added to your records.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Client Selection */}
                <div>
                  <label className="block text-sm font-bold text-foreground mb-3 font-primary uppercase tracking-wide">
                    Client *
                  </label>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                    <input
                      type="text"
                      value={clientSearchQuery}
                      onChange={(e) => setClientSearchQuery(e.target.value)}
                      placeholder="Search clients..."
                      className="w-full px-4 py-3 pl-10 font-primary neo-inset focus:ring-2 focus:ring-foreground/20 transition-all"
                    />
                  </div>
                  <div className="neo-inset rounded-lg max-h-48 overflow-y-auto">
                    {filteredClients.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground font-primary">
                        No clients found
                      </div>
                    ) : (
                      <div className="divide-y divide-foreground/10">
                        {filteredClients.map((client) => (
                          <button
                            key={client.id}
                            type="button"
                            onClick={() => setSelectedClient(client)}
                            className={`w-full p-3 text-left transition-colors hover:bg-foreground/5 ${
                              selectedClient?.id === client.id ? 'bg-foreground/10' : ''
                            }`}
                          >
                            <div className="font-bold text-foreground font-primary text-sm">
                              {client.name}
                            </div>
                            <div className="text-xs text-muted-foreground font-primary">
                              {client.email || 'No email'}
                              {client.company && ` • ${client.company}`}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedClient && (
                    <button
                      type="button"
                      onClick={() => setSelectedClient(null)}
                      className="text-xs text-red-600 hover:text-red-700 mt-2 font-primary"
                    >
                      Change Client
                    </button>
                  )}
                </div>

                {/* Rating */}
                <div>
                  <label className="block text-sm font-bold text-foreground mb-3 font-primary uppercase tracking-wide">
                    Rating *
                  </label>
                  <div className="neo-inset p-4 rounded-lg">
                    {renderStarSelector()}
                  </div>
                </div>

                {/* Title (Optional) */}
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2 uppercase tracking-wide font-primary">
                    Title (Optional)
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="E.g., Excellent Service!"
                    className="w-full px-4 py-3 font-primary neo-inset focus:ring-2 focus:ring-foreground/20 transition-all placeholder:text-muted-foreground/50"
                  />
                </div>

                {/* Service (Optional) */}
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2 uppercase tracking-wide font-primary">
                    Service (Optional)
                  </label>
                  <input
                    type="text"
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                    placeholder="E.g., Landscaping, Snow Removal"
                    className="w-full px-4 py-3 font-primary neo-inset focus:ring-2 focus:ring-foreground/20 transition-all placeholder:text-muted-foreground/50"
                  />
                </div>

                {/* Testimonial Content */}
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2 uppercase tracking-wide font-primary">
                    Testimonial Content *
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Enter the testimonial text that the client provided..."
                    rows={8}
                    className="w-full px-4 py-3 font-primary neo-inset focus:ring-2 focus:ring-foreground/20 transition-all resize-none placeholder:text-muted-foreground/50"
                    autoFocus
                  />
                </div>

                {/* Date Received */}
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2 uppercase tracking-wide font-primary">
                    Date Received
                  </label>
                  <input
                    type="date"
                    value={dateReceived}
                    onChange={(e) => setDateReceived(e.target.value)}
                    className="w-full px-4 py-3 font-primary neo-inset focus:ring-2 focus:ring-foreground/20 transition-all"
                  />
                  <p className="text-xs text-muted-foreground font-primary mt-1">
                    When did the client provide this testimonial?
                  </p>
                </div>

                {/* Info Box */}
                <div className="neo-inset p-4 border-l-4 border-tactical-gold">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-4 w-4 text-tactical-gold mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-muted-foreground font-primary">
                      Imported testimonials are marked as "SUBMITTED" and set to private by default.
                      You can review and approve them on the testimonials page.
                    </div>
                  </div>
                </div>

                {/* Error Display */}
                {error && (
                  <div className="neo-inset p-4 border-l-4 border-red-500">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <p className="text-sm text-red-600 font-primary">{error}</p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-foreground/10">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="neo-button px-6 py-3 uppercase tracking-wide transition-transform hover:scale-[1.02] font-primary font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !selectedClient || !content.trim()}
                    className="neo-button-active px-6 py-3 uppercase tracking-wide transition-transform hover:scale-[1.02] font-primary font-bold flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/20 border-t-transparent animate-spin rounded-full"></div>
                        <span>Importing...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        <span>Import Testimonial</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default ImportTestimonialModal
