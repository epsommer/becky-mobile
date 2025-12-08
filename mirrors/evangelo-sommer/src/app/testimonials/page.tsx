"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Star, Send, CheckCircle, Clock, XCircle, Eye, EyeOff, Award, Search, Filter, Plus, History, Upload, Download } from 'lucide-react'
import CRMLayout from '@/components/CRMLayout'
import TestimonialRequestModal from '@/components/TestimonialRequestModal'
import ImportTestimonialModal from '@/components/ImportTestimonialModal'

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
  client: {
    id: string
    name: string
    email?: string
    company?: string
  }
}

interface Client {
  id: string
  name: string
  email?: string
}

const TestimonialsPage = () => {
  const router = useRouter()
  const { status } = useSession()
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [filteredTestimonials, setFilteredTestimonials] = useState<Testimonial[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [ratingFilter, setRatingFilter] = useState<number>(0)
  const [visibilityFilter, setVisibilityFilter] = useState<string>('all')
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [clients, setClients] = useState<Client[]>([])

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  useEffect(() => {
    loadTestimonials()
    loadClients()
  }, [])

  useEffect(() => {
    filterTestimonials()
  }, [testimonials, searchQuery, statusFilter, ratingFilter, visibilityFilter])

  const loadTestimonials = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/testimonials')
      const data = await response.json()

      if (data.success) {
        setTestimonials(data.data || data.testimonials || [])
      }
    } catch (error) {
      console.error('Error loading testimonials:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadClients = async () => {
    try {
      const response = await fetch('/api/clients')
      const data = await response.json()

      if (data.success) {
        setClients(data.data || data.clients || [])
      }
    } catch (error) {
      console.error('Error loading clients:', error)
    }
  }

  const filterTestimonials = () => {
    let filtered = [...testimonials]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(t =>
        t.client.name.toLowerCase().includes(query) ||
        t.content.toLowerCase().includes(query) ||
        t.title?.toLowerCase().includes(query) ||
        t.serviceName?.toLowerCase().includes(query) ||
        t.client.company?.toLowerCase().includes(query)
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter)
    }

    // Rating filter
    if (ratingFilter > 0) {
      filtered = filtered.filter(t => t.rating === ratingFilter)
    }

    // Visibility filter
    if (visibilityFilter === 'public') {
      filtered = filtered.filter(t => t.isPublic)
    } else if (visibilityFilter === 'private') {
      filtered = filtered.filter(t => !t.isPublic)
    } else if (visibilityFilter === 'featured') {
      filtered = filtered.filter(t => t.isFeatured)
    }

    setFilteredTestimonials(filtered)
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

  const handleDelete = async (testimonialId: string) => {
    if (!confirm('Are you sure you want to delete this testimonial?')) {
      return
    }

    try {
      const response = await fetch(`/api/testimonials/${testimonialId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        loadTestimonials()
      }
    } catch (error) {
      console.error('Error deleting testimonial:', error)
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

  const getStats = () => {
    return {
      total: testimonials.length,
      pending: testimonials.filter(t => t.status === 'PENDING').length,
      submitted: testimonials.filter(t => t.status === 'SUBMITTED').length,
      approved: testimonials.filter(t => t.status === 'APPROVED').length,
      featured: testimonials.filter(t => t.isFeatured).length,
      public: testimonials.filter(t => t.isPublic).length,
    }
  }

  const stats = getStats()

  const getDynamicHeader = () => {
    const filters = []

    if (statusFilter !== 'all') {
      const statusLabels: Record<string, string> = {
        'PENDING': 'Pending',
        'SUBMITTED': 'Submitted',
        'APPROVED': 'Approved',
        'REJECTED': 'Rejected',
        'DRAFT': 'Draft'
      }
      filters.push(statusLabels[statusFilter])
    }

    if (ratingFilter > 0) {
      filters.push(`${ratingFilter}-Star`)
    }

    if (visibilityFilter !== 'all') {
      const visibilityLabels: Record<string, string> = {
        'public': 'Public',
        'private': 'Private',
        'featured': 'Featured'
      }
      filters.push(visibilityLabels[visibilityFilter])
    }

    if (searchQuery) {
      filters.push('Searched')
    }

    if (filters.length === 0) {
      return 'All Testimonials'
    }

    return `${filters.join(' ')} Testimonials`
  }

  if (status === "loading" || isLoading) {
    return (
      <CRMLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-foreground/20 border-t-transparent animate-spin mx-auto mb-4 rounded-full"></div>
            <p className="text-muted-foreground font-primary uppercase tracking-wide">Loading testimonials...</p>
          </div>
        </div>
      </CRMLayout>
    )
  }

  return (
    <CRMLayout>
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground uppercase tracking-wide font-primary">
              Testimonials
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-primary mt-1">
              Manage client testimonials and reviews
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              className="neo-button h-10 w-10 sm:h-11 sm:w-11 md:h-12 md:w-12 leading-none transition-transform hover:scale-[1.02] flex items-center justify-center"
              style={{ padding: '12px' }}
              onClick={() => setShowImportModal(true)}
              aria-label="Import testimonials"
            >
              <Download className="h-6 w-6 sm:h-7 sm:w-7" />
            </button>
            <button
              className="neo-button-active h-10 w-10 sm:h-11 sm:w-11 md:h-12 md:w-12 leading-none transition-transform hover:scale-[1.02] flex items-center justify-center"
              style={{ padding: '12px' }}
              onClick={() => setShowRequestModal(true)}
              aria-label="Request testimonial"
            >
              <Plus className="h-6 w-6 sm:h-7 sm:w-7" />
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="neo-inset p-4 rounded-lg">
            <div className="text-2xl font-bold text-foreground font-primary">{stats.total}</div>
            <div className="text-xs text-muted-foreground font-primary uppercase">Total</div>
          </div>
          <div className="neo-inset p-4 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600 font-primary">{stats.pending}</div>
            <div className="text-xs text-muted-foreground font-primary uppercase">Pending</div>
          </div>
          <div className="neo-inset p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600 font-primary">{stats.submitted}</div>
            <div className="text-xs text-muted-foreground font-primary uppercase">Submitted</div>
          </div>
          <div className="neo-inset p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600 font-primary">{stats.approved}</div>
            <div className="text-xs text-muted-foreground font-primary uppercase">Approved</div>
          </div>
          <div className="neo-inset p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-600 font-primary">{stats.featured}</div>
            <div className="text-xs text-muted-foreground font-primary uppercase">Featured</div>
          </div>
          <div className="neo-inset p-4 rounded-lg">
            <div className="text-2xl font-bold text-foreground font-primary">{stats.public}</div>
            <div className="text-xs text-muted-foreground font-primary uppercase">Public</div>
          </div>
        </div>

        {/* Filters */}
        <div className="neo-container">
          <div className="p-4 space-y-4">
            {/* Search */}
            <div className="neomorphic-input-wrapper relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search testimonials, clients, services..."
                className="neomorphic-input w-full pl-10 md:pl-[40px]"
              />
            </div>

            {/* Filter Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-2 font-primary uppercase">
                  Status
                </label>
                <div className="neomorphic-input-wrapper">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="neomorphic-input w-full text-sm pr-10"
                  >
                    <option value="all">All Statuses</option>
                    <option value="PENDING">Pending</option>
                    <option value="SUBMITTED">Submitted</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="DRAFT">Draft</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-2 font-primary uppercase">
                  Rating
                </label>
                <div className="neomorphic-input-wrapper">
                  <select
                    value={ratingFilter}
                    onChange={(e) => setRatingFilter(Number(e.target.value))}
                    className="neomorphic-input w-full text-sm pr-10"
                  >
                    <option value="0">All Ratings</option>
                    <option value="5">5 Stars</option>
                    <option value="4">4 Stars</option>
                    <option value="3">3 Stars</option>
                    <option value="2">2 Stars</option>
                    <option value="1">1 Star</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-2 font-primary uppercase">
                  Visibility
                </label>
                <div className="neomorphic-input-wrapper">
                  <select
                    value={visibilityFilter}
                    onChange={(e) => setVisibilityFilter(e.target.value)}
                    className="neomorphic-input w-full text-sm pr-10"
                  >
                    <option value="all">All</option>
                    <option value="public">Public Only</option>
                    <option value="private">Private Only</option>
                    <option value="featured">Featured Only</option>
                  </select>
                </div>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setStatusFilter('all')
                    setRatingFilter(0)
                    setVisibilityFilter('all')
                  }}
                  className="neo-button-sm w-full uppercase text-xs"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Testimonials List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold text-foreground uppercase tracking-wide font-primary">
              {getDynamicHeader()}
            </h2>
            <div className="text-sm text-muted-foreground font-primary">
              {filteredTestimonials.length} {filteredTestimonials.length === 1 ? 'result' : 'results'}
            </div>
          </div>

          {filteredTestimonials.length === 0 ? (
            <div className="neo-container">
              <div className="p-12 text-center">
                <Star className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-bold text-foreground mb-2 font-primary uppercase">
                  No Testimonials Found
                </h3>
                <p className="text-muted-foreground font-primary mb-4">
                  {searchQuery || statusFilter !== 'all' || ratingFilter > 0 || visibilityFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Start by requesting a testimonial from a client'}
                </p>
              </div>
            </div>
          ) : (
            filteredTestimonials.map((testimonial) => (
              <div key={testimonial.id} className="neo-container transition-transform hover:scale-[1.01]">
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
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
                        {testimonial.isPublic && (
                          <span className="neo-badge bg-green-100 text-green-800 text-xs uppercase px-2 py-1 flex items-center space-x-1">
                            <Eye className="h-3 w-3" />
                            <span>Public</span>
                          </span>
                        )}
                      </div>
                      {testimonial.title && (
                        <h3 className="text-lg font-bold text-foreground font-primary mb-1">
                          {testimonial.title}
                        </h3>
                      )}
                      <div className="flex items-center space-x-3 text-sm text-muted-foreground font-primary flex-wrap">
                        <button
                          onClick={() => router.push(`/clients/${testimonial.client.id}`)}
                          className="hover:text-foreground transition-colors"
                        >
                          {testimonial.client.name}
                        </button>
                        {testimonial.client.company && (
                          <>
                            <span>•</span>
                            <span>{testimonial.client.company}</span>
                          </>
                        )}
                        {testimonial.serviceName && (
                          <>
                            <span>•</span>
                            <span>{testimonial.serviceName}</span>
                          </>
                        )}
                        <span>•</span>
                        <button
                          onClick={() => router.push(`/clients/${testimonial.client.id}/master`)}
                          className="hover:text-accent transition-colors flex items-center gap-1"
                        >
                          <History className="h-3 w-3" />
                          <span>Master Timeline</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  {testimonial.content && (
                    <p className="text-foreground font-primary mb-4 whitespace-pre-wrap">
                      {testimonial.content}
                    </p>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-foreground/10">
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
                      <button
                        className="neo-button-sm px-2 py-1 transition-transform hover:scale-[1.05] bg-red-100 hover:bg-red-200"
                        onClick={() => handleDelete(testimonial.id)}
                        title="Delete testimonial"
                      >
                        <XCircle className="h-4 w-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <TestimonialRequestModal
        isOpen={showRequestModal}
        onClose={() => {
          setShowRequestModal(false)
          setSelectedClient(null)
        }}
        client={selectedClient}
        clients={clients}
        onRequestSent={loadTestimonials}
      />

      <ImportTestimonialModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        clients={clients}
        onImported={loadTestimonials}
      />
    </CRMLayout>
  )
}

export default TestimonialsPage
