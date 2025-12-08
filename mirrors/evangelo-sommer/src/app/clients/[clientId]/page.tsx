"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Mail, Phone, AlertTriangle, Edit, FileText, Calculator, Receipt, ScrollText, MapPin, User, Building, Plus, Trash2 } from 'lucide-react'
import CRMLayout from '@/components/CRMLayout'
import { getServiceById } from '@/lib/service-config'
import { getServiceInfo } from '@/lib/service-constants'
import { MultiServiceManager } from '@/lib/multi-service-utils'
import { Client } from '@/types/client'
import EditClientModal from '@/components/EditClientModal'
import ReceiptModal from '@/components/ReceiptModal'
import InvoiceModal from '@/components/InvoiceModal'
import QuoteModal from '@/components/QuoteModal'
import ClientConversationsSection from '@/components/ClientConversationsSection'
import ClientNotesSection from '@/components/ClientNotesSection'
import ClientTestimonialsSection from '@/components/ClientTestimonialsSection'
import ClientQuickActions from '@/components/ClientQuickActions'
import QuickMessageModal from '@/components/QuickMessageModal'
import AppointmentModal from '@/components/AppointmentModal'
import NoteModal from '@/components/NoteModal'
import TimeTrackerModal from '@/components/TimeTrackerModal'

const ClientDetailPage = () => {
  const params = useParams()
  const router = useRouter()
  const { status } = useSession()
  const [client, setClient] = useState<Client | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [showQuoteModal, setShowQuoteModal] = useState(false)
  const [selectedServiceLine, setSelectedServiceLine] = useState<{id: string, name: string, color: string} | null>(null)
  const [showQuickMessageModal, setShowQuickMessageModal] = useState(false)
  const [showAppointmentModal, setShowAppointmentModal] = useState(false)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [showTimeTrackerModal, setShowTimeTrackerModal] = useState(false)
  const [notesRefreshKey, setNotesRefreshKey] = useState(0)
  const [transactions, setTransactions] = useState<any[]>([])
  const [billingData, setBillingData] = useState<{totalBilled: number, pendingAmount: number, lastServiceDate: string | null}>({
    totalBilled: 0,
    pendingAmount: 0,
    lastServiceDate: null
  })

  const clientId = params.clientId as string

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  useEffect(() => {
    const loadClient = async () => {
      if (!clientId) return
      
      try {
        setIsLoading(true)
        const response = await fetch(`/api/clients/${clientId}`)
        const data = await response.json()

        if (data.success) {
          setClient(data.data)
        } else {
          console.error('Failed to load client:', data.error)
          setClient(null)
        }
      } catch (error) {
        console.error('Error loading client:', error)
        setClient(null)
      } finally {
        setIsLoading(false)
      }
    }

    loadClient()
  }, [clientId])

  const loadTransactions = async () => {
    try {
      const response = await fetch('/api/billing/receipts')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const receiptsData = await response.json()
      const receipts = receiptsData.receipts || receiptsData.data || receiptsData || []
      
      // Filter receipts for this specific client
      const clientReceipts = receipts.filter((receipt: any) => receipt.clientId === clientId)
      setTransactions(clientReceipts)
      
      // Calculate billing data
      const totalBilled = clientReceipts.reduce((sum: number, receipt: any) => sum + (receipt.totalAmount || 0), 0)
      const pendingReceipts = clientReceipts.filter((receipt: any) => receipt.status === 'sent')
      const pendingAmount = pendingReceipts.reduce((sum: number, receipt: any) => sum + (receipt.totalAmount || 0), 0)
      
      // Find last service date
      const sortedReceipts = clientReceipts.sort((a: any, b: any) => 
        new Date(b.serviceDate || b.createdAt).getTime() - new Date(a.serviceDate || a.createdAt).getTime()
      )
      const lastServiceDate = sortedReceipts.length > 0 ? (sortedReceipts[0].serviceDate || sortedReceipts[0].createdAt) : null
      
      setBillingData({
        totalBilled,
        pendingAmount,
        lastServiceDate
      })
    } catch (error) {
      console.error('Error loading transactions:', error)
      setTransactions([])
      setBillingData({ totalBilled: 0, pendingAmount: 0, lastServiceDate: null })
    }
  }

  useEffect(() => {
    if (clientId) {
      loadTransactions()
    }
  }, [clientId])

  const handleClientUpdate = (updatedData: Partial<Client>) => {
    if (client) {
      const updatedClient = { ...client, ...updatedData, updatedAt: new Date().toISOString() }
      setClient(updatedClient)
    }
  }

  const handleQuickMessage = async (conversation: any, scheduleAppointment?: boolean, isNewConversation?: boolean) => {
    try {
      // Save or update the conversation via API
      const method = isNewConversation ? 'POST' : 'PUT'
      const url = isNewConversation ? '/api/conversations' : `/api/conversations/${conversation.id}`

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(conversation),
      })

      if (!response.ok) {
        throw new Error(`Failed to ${isNewConversation ? 'create' : 'update'} conversation`)
      }

      // Show success message
      const action = isNewConversation ? 'created' : 'updated'
      console.log(`Conversation ${action} successfully`)

      // If scheduling appointment, redirect to time manager
      if (scheduleAppointment) {
        router.push(`/time-manager?client=${clientId}&schedule=true`)
      }
    } catch (error) {
      console.error('Error saving quick message:', error)
      alert('Failed to save message. Please try again.')
    }
  }

  const handleScheduleAppointment = () => {
    // Open appointment modal
    setShowAppointmentModal(true)
  }

  const isProfileIncomplete = (client: Client) => {
    return !client.email || !client.phone || !client.address?.street
  }

  const getMissingFields = (client: Client) => {
    const missing = []
    if (!client.email) missing.push('Email')
    if (!client.phone) missing.push('Phone')
    if (!client.address?.street) missing.push('Address')
    return missing
  }

  const getServiceIcon = (serviceId: string) => {
    const icons: { [key: string]: React.ReactNode } = {
      woodgreen: <span className="text-green-600">🌿</span>,
      whiteknight: <span className="text-tactical-gold">❄️</span>,
      pupawalk: <span className="text-purple-600">🐕</span>,
      creative: <span className="text-gold">🎨</span>,
      // Legacy support
      landscaping: <span className="text-green-600">🌿</span>,
      'snow-removal': <span className="text-tactical-gold">❄️</span>,
      'pet-services': <span className="text-purple-600">🐕</span>
    }
    return icons[serviceId] || <span>🔧</span>
  }

  const getServiceName = (serviceId: string) => {
    if (!serviceId) return 'Unknown Service'
    const serviceInfo = getServiceInfo(serviceId as any)
    return serviceInfo ? serviceInfo.name : serviceId.replace(/[-_]/g, ' ').toUpperCase()
  }

  const getAllClientServices = (client: Client) => {
    return MultiServiceManager.getClientServices(client)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No services yet'
    return new Date(dateString).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (status === "loading" || isLoading) {
    return (
      <CRMLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-foreground/20 border-t-transparent animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground font-primary uppercase tracking-wide">Loading client...</p>
          </div>
        </div>
      </CRMLayout>
    )
  }

  if (!client) {
    return (
      <CRMLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <User className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h1 className="text-2xl font-bold text-foreground mb-2 font-primary uppercase">
              Client Not Found
            </h1>
            <p className="text-muted-foreground font-primary mb-4">
              The client you're looking for doesn't exist.
            </p>
            <button
              className="neo-button px-6 py-2 uppercase tracking-wide transition-transform hover:scale-[1.02]"
              onClick={() => router.push('/clients')}
            >
              Back to Clients
            </button>
          </div>
        </div>
      </CRMLayout>
    )
  }

  const service = getServiceById(client.serviceId)

  return (
    <CRMLayout>
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* Client Header - BELONGS ON CLIENT PAGE */}
        <div className="neo-inset p-3 sm:p-6 transition-transform hover:scale-[1.01]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
              <div className="w-12 h-12 sm:w-16 sm:h-16 neo-button-circle flex items-center justify-center text-foreground font-bold text-base sm:text-xl font-primary flex-shrink-0">
                {client.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground uppercase tracking-wide font-primary truncate">
                  {client.name}
                </h1>
                <div className="text-xs sm:text-sm text-muted-foreground font-medium font-primary truncate">
                  {client.company || 'Individual Client'}
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mt-2 gap-1 sm:gap-0">
                  {client.email && (
                    <div className="flex items-center text-xs sm:text-sm text-muted-foreground font-primary truncate">
                      <Mail className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                      <span className="truncate">{client.email}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center text-xs sm:text-sm text-muted-foreground font-primary">
                      <Phone className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                      {client.phone}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
              <span className={`neo-badge px-2 sm:px-3 py-1 text-xs uppercase font-primary flex-shrink-0 ${
                client.status === 'active' ? 'bg-green-600 text-white' : ''
              }`}>
                {client.status}
              </span>
              <button
                className="neo-icon-button sm:neo-button sm:px-4 sm:py-2 sm:gap-2"
                onClick={() => setShowEditModal(true)}
                aria-label="Edit Client"
                title="Edit Client"
              >
                <Edit className="h-4 w-4" />
                <span className="sm:inline" style={{ display: 'none' }}>Edit Client</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <ClientQuickActions
          client={client}
          onMessageClient={() => setShowQuickMessageModal(true)}
          onScheduleAppointment={handleScheduleAppointment}
          onCreateReceipt={() => setShowReceiptModal(true)}
          onAddNote={() => setShowNoteModal(true)}
          onTimeTracker={() => setShowTimeTrackerModal(true)}
        />

        {/* Incomplete Profile Warning - BELONGS ON CLIENT PAGE */}
        {isProfileIncomplete(client) && (
          <div className="neo-inset p-4 border-l-4 border-yellow-500">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
              <div className="flex-1">
                <h3 className="font-bold text-foreground uppercase font-primary">
                  Incomplete Profile
                </h3>
                <p className="text-sm text-muted-foreground font-primary">
                  Missing: {getMissingFields(client).join(', ')}
                </p>
              </div>
              <button
                className="neo-button px-4 py-2 uppercase tracking-wide transition-transform hover:scale-[1.02]"
                onClick={() => setShowEditModal(true)}
              >
                Complete Profile
              </button>
            </div>
          </div>
        )}


        {/* Client Services Section */}
        <div className="neo-container transition-transform hover:scale-[1.01]">
          <div className="neo-inset border-b border-foreground/10 p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground uppercase tracking-wide font-primary">
                Services
              </h3>
              <button
                className="neo-button px-3 py-2 flex items-center gap-2 text-xs uppercase transition-transform hover:scale-[1.02]"
                onClick={() => {
                  // TODO: Add service functionality
                  console.log('Add service clicked')
                }}
                title="Add Service"
              >
                <Plus className="h-4 w-4" />
                Add Service
              </button>
            </div>
          </div>
          <div className="p-6">
            {(() => {
              const services = getAllClientServices(client)

              if (services.length === 0) {
                return (
                  <div className="text-center py-6">
                    <span className="text-muted-foreground font-primary">No services purchased yet</span>
                  </div>
                )
              }

              return (
                <div className="space-y-3">
                  {services.map((serviceId) => {
                    // Count contracts for this service
                    const contractCount = client.serviceContracts?.filter(
                      contract => contract.serviceId === serviceId
                    ).length || 0

                    return (
                      <div key={serviceId} className="neo-inset p-4 rounded-lg transition-transform hover:scale-[1.01]">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3 flex-1">
                            {getServiceIcon(serviceId)}
                            <div>
                              <div className="font-bold text-foreground font-primary uppercase">
                                {getServiceName(serviceId)}
                              </div>
                              {contractCount > 0 && (
                                <div className="text-xs text-muted-foreground font-primary mt-1">
                                  {contractCount} active contract{contractCount > 1 ? 's' : ''}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="neo-badge px-3 py-1 text-xs uppercase font-primary bg-green-600 text-white">
                              Active
                            </span>
                            <button
                              className="neo-icon-button transition-transform hover:scale-[1.1]"
                              onClick={() => {
                                // TODO: Remove service functionality
                                console.log('Remove service clicked:', serviceId)
                              }}
                              title="Remove Service"
                              aria-label="Remove Service"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>
        </div>

        {/* Client Details - BELONGS ON CLIENT PAGE */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="neo-container transition-transform hover:scale-[1.01]">
            <div className="neo-inset border-b border-foreground/10 p-6">
              <h3 className="text-lg font-bold text-foreground uppercase tracking-wide font-primary">
                Contact Information
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 font-primary">
                    Email
                  </div>
                  <div className="text-foreground font-primary">
                    {client.email || 'Not provided'}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 font-primary">
                    Phone
                  </div>
                  <div className="text-foreground font-primary">
                    {client.phone || 'Not provided'}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 font-primary">
                    Address
                  </div>
                  <div className="text-foreground font-primary">
                    {client.address?.street || 'Not provided'}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 font-primary">
                    Company
                  </div>
                  <div className="text-foreground font-primary">
                    {client.company || 'Individual'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-foreground/10">
                <div>
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 font-primary">
                    Status
                  </div>
                  <span className={`neo-badge px-3 py-1 text-xs uppercase font-primary ${
                    client.status === 'active' ? 'bg-green-600 text-white' : ''
                  }`}>
                    {client.status}
                  </span>
                </div>
                <div>
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 font-primary">
                    Budget
                  </div>
                  <div className="text-foreground font-primary">
                    {client.budget ? `$${client.budget.toLocaleString()}` : 'Not specified'}
                  </div>
                </div>
              </div>

              {client.notes && (
                <div className="mt-6 pt-6 border-t border-foreground/10">
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 font-primary">
                    Notes
                  </div>
                  <p className="text-foreground font-primary whitespace-pre-wrap">
                    {client.notes}
                  </p>
                </div>
              )}

              {/* Personal Information */}
              {(client.occupation || client.hobbies?.length || client.dateOfBirth) && (
                <div className="mt-6 pt-6 border-t border-foreground/10">
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 font-primary">
                    Personal Information
                  </div>
                  <div className="space-y-3">
                    {client.occupation && (
                      <div>
                        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 font-primary">
                          Occupation
                        </div>
                        <div className="text-foreground font-primary">
                          {client.occupation}
                        </div>
                      </div>
                    )}

                    {client.dateOfBirth && (
                      <div>
                        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 font-primary">
                          Date of Birth
                        </div>
                        <div className="text-foreground font-primary">
                          {new Date(client.dateOfBirth).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </div>
                      </div>
                    )}

                    {client.hobbies && client.hobbies.length > 0 && (
                      <div>
                        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 font-primary">
                          Hobbies & Interests
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {client.hobbies.map((hobby, index) => (
                            <span
                              key={index}
                              className="neo-badge px-3 py-1 text-xs font-primary bg-tactical-gold/20 text-foreground"
                            >
                              {hobby}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="neo-container transition-transform hover:scale-[1.01]">
            <div className="neo-inset border-b border-foreground/10 p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground uppercase tracking-wide font-primary">
                  Billing
                </h3>
                <button
                  className="neo-button-sm text-xs uppercase transition-transform hover:scale-[1.02]"
                  onClick={() => {
                    router.push('/billing')
                  }}
                >
                  View Billing
                </button>
              </div>
            </div>
            <div className="p-6">
              {(() => {
                // Group contracts by service line (proper implementation)
                const serviceGroups: { [key: string]: { name: string; color: string; contracts: any[] } } = {}
                
                if (client.serviceContracts && client.serviceContracts.length > 0) {
                  client.serviceContracts.forEach(contract => {
                    // Use proper service line grouping
                    const serviceLineId = contract.serviceId || 'legacy'

                    if (!serviceGroups[serviceLineId]) {
                      serviceGroups[serviceLineId] = {
                        name: contract.serviceName || (serviceLineId === 'legacy' ? 'Legacy Services' : 'Unknown Service'),
                        color: '#6B7280',
                        contracts: []
                      }
                    }
                    serviceGroups[serviceLineId].contracts.push(contract)
                  })
                }
                
                if (Object.keys(serviceGroups).length === 0) {
                  // If no service contracts but we have transactions, show recent activity
                  if (transactions.length > 0) {
                    return (
                      <div className="space-y-4">
                        <div className="text-center py-4 border-b border-foreground/10">
                          <span className="text-muted-foreground font-primary text-sm">No formal service contracts • Showing recent billing activity</span>
                        </div>

                        {/* Recent Activity Summary */}
                        <div className="space-y-3">
                          <div className="text-xs text-muted-foreground font-primary uppercase tracking-wide">
                            Recent Activity
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Last Service:</span>
                              <span className="text-foreground">{formatDate(billingData.lastServiceDate)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Total Billed:</span>
                              <span className="text-foreground font-medium">{formatCurrency(billingData.totalBilled)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Pending:</span>
                              <span className="text-yellow-600 font-medium">{formatCurrency(billingData.pendingAmount)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Total Receipts:</span>
                              <span className="text-foreground">{transactions.length}</span>
                            </div>
                          </div>
                        </div>

                        {/* Recent Transactions */}
                        <div className="space-y-3">
                          <div className="text-xs text-muted-foreground font-primary uppercase tracking-wide">
                            Recent Transactions
                          </div>
                          <div className="space-y-2">
                            {transactions.slice(0, 3).map((transaction) => (
                              <div key={transaction.id} className="neo-inset p-3 rounded-lg transition-transform hover:scale-[1.01]">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="text-sm font-medium text-foreground">{transaction.receiptNumber}</div>
                                    <div className="text-xs text-muted-foreground">{formatDate(transaction.serviceDate || transaction.createdAt)}</div>
                                    <div className="text-xs text-muted-foreground">{transaction.items?.[0]?.description || 'Service'}</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-sm font-medium text-foreground">{formatCurrency(transaction.totalAmount)}</div>
                                    <div className={`text-xs px-2 py-1 rounded ${
                                      transaction.status === 'paid' ? 'bg-green-100 text-green-800' :
                                      transaction.status === 'sent' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-gray-200 text-gray-700'
                                    }`}>
                                      {transaction.status}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                            {transactions.length > 3 && (
                              <div className="text-center pt-2">
                                <span className="text-xs text-muted-foreground">+{transactions.length - 3} more transactions</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  }
                  
                  // No contracts and no transactions
                  return (
                    <div className="text-center py-6">
                      <span className="text-muted-foreground font-primary">No service contracts or transactions found</span>
                    </div>
                  )
                }

                return (
                  <div className="space-y-4">
                    {(!client.email || !client.name) && (
                      <div className="mb-4 neo-inset p-3 border-l-4 border-yellow-500 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          <div className="text-xs text-muted-foreground font-primary">
                            Some document features require complete client information (email, name)
                          </div>
                        </div>
                      </div>
                    )}
                    {Object.entries(serviceGroups).map(([serviceLineId, serviceGroup]) => {
                      const { name: serviceName, color: serviceColor, contracts } = serviceGroup as any
                      return (
                        <div key={serviceLineId} className="neo-container rounded-lg border border-foreground/10 transition-transform hover:scale-[1.01]">
                          {/* Service Line Header */}
                          <div
                            className="border-b p-4"
                            style={{
                              backgroundColor: `${serviceColor}20`,
                              borderBottomColor: serviceColor,
                              borderLeftColor: serviceColor,
                              borderLeftWidth: '4px'
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <span style={{ color: serviceColor }} className="text-xl">
                                  {serviceLineId === 'whiteknight_snow' ? '❄️' : '🌿'}
                                </span>
                                <h4 className="text-lg font-bold text-foreground font-primary uppercase">
                                  {serviceName}
                                </h4>
                              </div>
                              <span
                                className="neo-badge text-xs uppercase px-2 py-1"
                                style={{
                                  backgroundColor: serviceColor,
                                  color: 'white'
                                }}
                              >
                                {contracts.length} Contract{contracts.length > 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                          
                          {/* Service Contracts */}
                          <div className="p-4 space-y-3">
                            {contracts.map((contract: any, index: number) => {
                              const statusColors = {
                                'ONGOING': 'bg-green-100 text-green-800',
                                'COMPLETED': 'bg-tactical-gold-muted text-tactical-brown-dark',
                                'PAUSED': 'bg-yellow-100 text-yellow-800',
                                'CANCELLED': 'bg-red-100 text-red-800',
                                'SCHEDULED': 'bg-purple-100 text-purple-800'
                              };
                              
                              return (
                                <div key={contract.id} className="neo-inset rounded-lg p-3 transition-transform hover:scale-[1.01]">
                                  {/* Contract Info */}
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex-1">
                                      <div className="flex items-center space-x-2">
                                        <span className="font-medium text-foreground font-primary text-sm">
                                          {contract.serviceCategory}
                                        </span>
                                        {contract.period && (
                                          <span className="text-xs text-muted-foreground font-primary">
                                            ({contract.period})
                                          </span>
                                        )}
                                      </div>
                                      {contract.contractValue && (
                                        <div className="text-xs text-muted-foreground font-primary">
                                          ${contract.contractValue.toLocaleString()}
                                        </div>
                                      )}
                                    </div>
                                    <span className={`neo-badge ${statusColors[contract.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'} text-xs uppercase px-2 py-1`}>
                                      {contract.status}
                                    </span>
                                  </div>
                                  
                                  {/* Document Actions */}
                                  <div className="flex items-center justify-between pt-2 border-t border-foreground/10">
                                    <div className="text-xs text-muted-foreground font-primary uppercase tracking-wide">
                                      Documents
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      <button
                                        className="neo-button-sm h-7 w-7 p-0 transition-transform hover:scale-[1.1]"
                                        disabled={!client.email}
                                        onClick={() => {
                                          setSelectedServiceLine({
                                            id: serviceLineId,
                                            name: serviceName,
                                            color: serviceColor
                                          })
                                          setShowInvoiceModal(true)
                                        }}
                                        title="Generate Invoice"
                                      >
                                        <FileText className="h-3 w-3" />
                                      </button>
                                      <button
                                        className="neo-button-sm h-7 w-7 p-0 transition-transform hover:scale-[1.1]"
                                        onClick={() => {
                                          setSelectedServiceLine({
                                            id: serviceLineId,
                                            name: serviceName,
                                            color: serviceColor
                                          })
                                          setShowQuoteModal(true)
                                        }}
                                        title="Generate Quote"
                                      >
                                        <Calculator className="h-3 w-3" />
                                      </button>
                                      <button
                                        className="neo-button-sm h-7 w-7 p-0 transition-transform hover:scale-[1.1]"
                                        disabled={!client.email}
                                        onClick={() => {
                                          setSelectedServiceLine({
                                            id: serviceLineId,
                                            name: serviceName,
                                            color: serviceColor
                                          })
                                          setShowReceiptModal(true)
                                        }}
                                        title="Generate Receipt"
                                      >
                                        <Receipt className="h-3 w-3" />
                                      </button>
                                      <button
                                        className="neo-button-sm h-7 w-7 p-0 transition-transform hover:scale-[1.1]"
                                        title="Statement of Work"
                                      >
                                        <ScrollText className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>
          </div>
        </div>


        {/* Client Testimonials Section */}
        <ClientTestimonialsSection clientId={clientId} client={client} />

        {/* Client Notes Section */}
        <ClientNotesSection clientId={clientId} clientName={client.name} refreshTrigger={notesRefreshKey} />

        {/* Client Conversations Section */}
        <ClientConversationsSection clientId={clientId} client={client} />
      </div>

      {/* Modals */}
      <EditClientModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        client={client}
        onSave={handleClientUpdate}
      />

      <ReceiptModal
        isOpen={showReceiptModal}
        onClose={() => {
          setShowReceiptModal(false)
          setSelectedServiceLine(null)
        }}
        client={client}
        onReceiptCreated={(receipt) => {
          console.log('Receipt created:', receipt, 'for service line:', selectedServiceLine)
          // Reload transactions to show the new receipt
          loadTransactions()
        }}
      />

      <InvoiceModal
        isOpen={showInvoiceModal}
        onClose={() => {
          setShowInvoiceModal(false)
          setSelectedServiceLine(null)
        }}
        client={client}
        onInvoiceCreated={(invoice) => {
          console.log('Invoice created:', invoice, 'for service line:', selectedServiceLine)
          // Reload transactions in case invoices are included in billing data
          loadTransactions()
        }}
      />

      <QuoteModal
        isOpen={showQuoteModal}
        onClose={() => {
          setShowQuoteModal(false)
          setSelectedServiceLine(null)
        }}
        client={client}
        onQuoteCreated={(quote) => {
          console.log('Quote created:', quote, 'for service line:', selectedServiceLine)
          // Reload transactions in case quotes are included in billing data
          loadTransactions()
        }}
      />

      <QuickMessageModal
        isOpen={showQuickMessageModal}
        onClose={() => setShowQuickMessageModal(false)}
        client={client}
        onSave={handleQuickMessage}
        onScheduleAppointment={handleScheduleAppointment}
      />

      <AppointmentModal
        isOpen={showAppointmentModal}
        onClose={() => setShowAppointmentModal(false)}
        client={client}
      />

      <NoteModal
        isOpen={showNoteModal}
        onClose={() => setShowNoteModal(false)}
        client={client}
        onSave={(note) => {
          console.log('Note saved:', note)
          // Trigger refresh of ClientNotesSection by changing its key
          setNotesRefreshKey(prev => prev + 1)
        }}
      />

      {/* Time Tracker Modal */}
      <TimeTrackerModal
        isOpen={showTimeTrackerModal}
        onClose={() => setShowTimeTrackerModal(false)}
        client={client}
      />
    </CRMLayout>
  )
}

export default ClientDetailPage
