'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { CalendarDays, DollarSign, FileText, Settings, Eye, Edit, Plus, CheckCircle, Send, Trash2, Archive, XCircle, TrendingUp, Receipt, Search, Filter, Download, Clock } from "lucide-react"
import Link from "next/link"
import CreateReceiptModal from './CreateReceiptModal'
import ReceiptDetailsModal from './ReceiptDetailsModal'
import { Client as ClientType } from '@/types/client'

interface ServiceLine {
  id: string
  name: string
  slug: string
  description: string
  color: string
  isActive: boolean
}

interface ServiceContract {
  id: string
  serviceLineId: string
  serviceLine?: ServiceLine
  serviceName: string
  serviceCategory: string
  status: string
  period: string
  contractValue: number
  frequency: string
  notes: string
  isActive: boolean
  isPrimary: boolean
  billingDetails?: any
  seasonalInfo?: any
}

interface ServiceRecord {
  id: string
  serviceLineId: string
  serviceLine?: ServiceLine
  serviceDate: string
  serviceType: string
  serviceArea: string
  completionStatus: string
  notes: string
  amount: number
  billingAmount: number
  billingStatus: string
}

interface Transaction {
  id: string;
  type: 'receipt' | 'invoice';
  receiptNumber?: string;
  invoiceNumber?: string;
  clientId: string;
  clientName: string;
  amount: number;
  status: 'paid' | 'sent' | 'draft';
  emailSentAt?: string;
  emailDeliveredAt?: string;
  date: string;
  serviceType?: string;
  description?: string;
  isEditable?: boolean;
  isDuplicate?: boolean;
}

interface BillingAnalytics {
  totalRevenue: number;
  pendingInvoices: number;
  pendingAmount: number;
  totalReceipts: number;
  currentMonthRevenue: number;
  recentTransactions: Transaction[];
}

interface BillingFilters {
  dateRange: 'all' | 'thisMonth' | 'lastMonth' | 'thisYear';
  clientId: string;
  transactionType: 'all' | 'receipts' | 'invoices';
  searchTerm: string;
}

interface BillingRecord {
  id: string
  serviceLineId: string
  serviceLine?: ServiceLine
  invoiceNumber: string
  amount: number
  currency: string
  billingPeriod: string
  billingDate: string
  dueDate?: string
  paidDate?: string
  status: string
  description: string
  metadata?: any
}

// Extended Client interface with billing-specific fields
type ExtendedClient = ClientType & {
  serviceContracts: ServiceContract[]
  serviceRecords: ServiceRecord[]
  billingRecords: BillingRecord[]
}

interface ClientServicesBillingProps {
  clientId: string
}

const ClientServicesBilling: React.FC<ClientServicesBillingProps> = ({ clientId }) => {
  const [client, setClient] = useState<ExtendedClient | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'services' | 'billing'>('billing')
  const [selectedServiceLine, setSelectedServiceLine] = useState<string | null>(null)
  
  // Receipt/transaction management
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loadingTransactions, setLoadingTransactions] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState<Transaction | null>(null)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingReceipt, setEditingReceipt] = useState<Transaction | null>(null)
  const [sendingReceiptId, setSendingReceiptId] = useState<string | null>(null)
  
  // Analytics and filtering
  const [analytics, setAnalytics] = useState<BillingAnalytics>({
    totalRevenue: 0,
    pendingInvoices: 0,
    pendingAmount: 0,
    totalReceipts: 0,
    currentMonthRevenue: 0,
    recentTransactions: []
  })
  const [filters, setFilters] = useState<BillingFilters>({
    dateRange: 'all',
    clientId: clientId,
    transactionType: 'all',
    searchTerm: ''
  })

  useEffect(() => {
    fetchClientData()
  }, [clientId])

  useEffect(() => {
    if (activeTab === 'billing' && client) {
      loadTransactions()
    }
  }, [activeTab, client, clientId])

  const fetchClientData = async () => {
    try {
      setLoading(true)
      console.log('Fetching client data for clientId:', clientId)
      
      const response = await fetch(`/api/clients/${clientId}/services-billing`)
      console.log('API Response status:', response.status)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('Client data received:', { 
        id: data.id, 
        name: data.name, 
        serviceContracts: data.serviceContracts?.length,
        serviceRecords: data.serviceRecords?.length,
        billingRecords: data.billingRecords?.length
      })
      
      // Debug service line separation
      console.log('🔍 DEBUG: Service Line Analysis')
      console.log('Service Records:', data.serviceRecords)

      const recordsByServiceLine: Record<string, ServiceRecord[]> = {}
      data.serviceRecords?.forEach((record: ServiceRecord) => {
        const serviceLineId = record.serviceLineId || 'unknown'
        if (!recordsByServiceLine[serviceLineId]) {
          recordsByServiceLine[serviceLineId] = []
        }
        recordsByServiceLine[serviceLineId].push(record)
      })

      console.log('Records grouped by service line:', recordsByServiceLine)

      Object.keys(recordsByServiceLine).forEach(serviceLineId => {
        const records = recordsByServiceLine[serviceLineId]
        const serviceLine = records[0]?.serviceLine
        console.log(`📦 ${serviceLine?.name || 'Unknown'} (${serviceLineId}):`)
        console.log(`   Records: ${records.length}`)
        console.log(`   Service Types: ${[...new Set(records.map((r: ServiceRecord) => r.serviceType))].join(', ')}`)
        console.log(`   Color: ${serviceLine?.color || 'undefined'}`)
      })
      
      setClient(data)
    } catch (error) {
      console.error('Error fetching client data:', error)
      console.error('ClientId that failed:', clientId)
      setClient(null)
    } finally {
      setLoading(false)
    }
  }

  const loadTransactions = async () => {
    setLoadingTransactions(true);
    try {
      // Fetch receipts filtered by clientId on the server side
      const response = await fetch(`/api/billing/receipts?clientId=${clientId}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const receiptsData = await response.json();
      const clientReceipts = Array.isArray(receiptsData) ? receiptsData : (receiptsData.data || receiptsData.receipts || []);
      
      // Transform receipts to Transaction format
      const clientTransactions: Transaction[] = clientReceipts.map((receipt: any) => {
        let status: 'draft' | 'sent' | 'paid';
        if (receipt.status === 'paid') {
          status = 'paid';
        } else if (receipt.status === 'sent') {
          status = 'sent';
        } else {
          status = 'draft';
        }
        
        return {
          id: receipt.id,
          type: 'receipt' as const,
          receiptNumber: receipt.receiptNumber,
          clientId: receipt.clientId,
          clientName: receipt.client?.name || client?.name || 'Unknown Client',
          amount: receipt.totalAmount || 0,
          status: status,
          date: receipt.serviceDate || receipt.createdAt,
          serviceType: receipt.items?.[0]?.serviceType,
          description: receipt.items?.map((item: any) => item.description).join(', ') || 'No description',
          emailSentAt: receipt.emailSentAt,
          emailDeliveredAt: receipt.emailDeliveredAt,
          isEditable: status !== 'sent',
          isDuplicate: receipt.isDuplicate || false
        };
      });
      
      setTransactions(clientTransactions);
      
      // Calculate analytics for this client
      const totalRevenue = clientTransactions
        .filter(t => t.status === 'paid')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const pendingAmount = clientTransactions
        .filter(t => t.status === 'sent')
        .reduce((sum, t) => sum + t.amount, 0);
        
      const pendingCount = clientTransactions.filter(t => t.status === 'sent').length;
      
      const currentMonth = new Date().getMonth();
      const currentMonthRevenue = clientTransactions
        .filter(t => new Date(t.date).getMonth() === currentMonth && t.status === 'paid')
        .reduce((sum, t) => sum + t.amount, 0);
      
      setAnalytics({
        totalRevenue,
        pendingInvoices: pendingCount,
        pendingAmount,
        totalReceipts: clientTransactions.length,
        currentMonthRevenue,
        recentTransactions: clientTransactions.slice(0, 5)
      });
      
    } catch (error) {
      console.error('Error loading transactions:', error);
      setTransactions([]);
      setAnalytics({
        totalRevenue: 0,
        pendingInvoices: 0,
        pendingAmount: 0,
        totalReceipts: 0,
        currentMonthRevenue: 0,
        recentTransactions: []
      });
    } finally {
      setLoadingTransactions(false);
    }
  };

  const getServiceLineColor = (serviceLine?: ServiceLine) => {
    return serviceLine?.color || '#6B7280'
  }

  const getStatusColor = (status: string) => {
    const statusColors = {
      ACTIVE: 'bg-green-100 text-green-800',
      ONGOING: 'bg-tactical-gold-muted text-tactical-brown-dark',
      COMPLETED: 'bg-green-100 text-green-800',
      PAID: 'bg-green-100 text-green-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      OVERDUE: 'bg-red-100 text-red-800'
    }
    return statusColors[status as keyof typeof statusColors] || 'bg-tactical-grey-200 text-tactical-grey-700'
  }

  const formatCurrency = (amount: number, currency = 'CAD') => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-CA')
  }

  const groupByServiceLine = <T extends { serviceLineId?: string; serviceLine?: ServiceLine }>(items: T[], itemType?: string) => {
    const groups = items.reduce((groups, item) => {
      const serviceLineId = item.serviceLineId || 'unknown'
      if (!groups[serviceLineId]) {
        groups[serviceLineId] = []
      }
      groups[serviceLineId].push(item)
      return groups
    }, {} as Record<string, T[]>)
    
    // Debug grouping
    if (itemType) {
      console.log(`🔍 DEBUG: ${itemType} grouped by service line:`)
      Object.keys(groups).forEach(serviceLineId => {
        const items = groups[serviceLineId]
        const serviceLine = items[0]?.serviceLine
        console.log(`  ${serviceLine?.name || 'Unknown'} (${serviceLineId}): ${items.length} ${itemType}`)
      })
    }
    
    return groups
  }

  // Filter transactions
  const filteredTransactions = transactions.filter((transaction) => {
    if (filters.transactionType === 'receipts' && transaction.type !== 'receipt') return false;
    if (filters.transactionType === 'invoices' && transaction.type !== 'invoice') return false;
    if (filters.searchTerm && !transaction.description?.toLowerCase().includes(filters.searchTerm.toLowerCase()) && 
        !transaction.clientName.toLowerCase().includes(filters.searchTerm.toLowerCase())) return false;
    return true;
  });

  // Receipt handler functions
  const handleViewReceipt = (transaction: Transaction) => {
    if (transaction.type === 'receipt') {
      setSelectedReceipt(transaction);
      setShowReceiptModal(true);
    }
  };

  const handleEditReceipt = (transaction: Transaction) => {
    if (transaction.type === 'receipt') {
      if (transaction.status === 'draft' || transaction.status === 'paid') {
        setEditingReceipt(transaction);
        setShowEditModal(true);
      }
    }
  };

  const handleSendReceipt = async (transaction: Transaction) => {
    if (transaction.emailSentAt || transaction.status === 'sent') {
      alert('This receipt has already been sent.');
      return;
    }

    const confirmed = confirm(`Send receipt ${transaction.receiptNumber} to ${transaction.clientName}?`);
    if (!confirmed) return;

    setSendingReceiptId(transaction.id);
    try {
      const response = await fetch(`/api/billing/receipts/${transaction.id}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientEmail: client?.email,
          clientName: client?.name
        }),
      });

      if (response.ok) {
        alert('Receipt sent successfully!');
        await loadTransactions(); // Refresh the list
      } else {
        const error = await response.json();
        alert(`Failed to send receipt: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error sending receipt:', error);
      alert('Failed to send receipt. Please try again.');
    } finally {
      setSendingReceiptId(null);
    }
  };

  const handleDeleteReceipt = async (transaction: Transaction) => {
    const confirmed = confirm(`Are you sure you want to delete receipt ${transaction.receiptNumber}?`);
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/billing/receipts/${transaction.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Receipt deleted successfully!');
        await loadTransactions(); // Refresh the list
      } else {
        const error = await response.json();
        alert(`Failed to delete receipt: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting receipt:', error);
      alert('Failed to delete receipt. Please try again.');
    }
  };

  const handleReceiptCreated = async (newReceipt: any) => {
    console.log('New receipt created:', newReceipt);
    await loadTransactions(); // Refresh the list
  };

  const handleReceiptUpdate = async (updatedReceipt: any) => {
    console.log('Receipt updated:', updatedReceipt);
    await loadTransactions(); // Refresh the list
  };

  // Analytics components
  const BillingMetricsCard = ({ 
    icon, 
    title, 
    value, 
    trend, 
    className = "" 
  }: { 
    icon: React.ReactNode; 
    title: string; 
    value: string; 
    trend?: string; 
    className?: string; 
  }) => {
    return (
      <div className={`p-6 border-2 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          {icon}
          <span className="text-xs font-primary uppercase tracking-wide text-medium-grey">
            {title}
          </span>
        </div>
        <div className="text-2xl font-bold text-hud-text-primary font-primary mb-1">
          {value}
        </div>
        {trend && (
          <div className="text-xs text-medium-grey font-primary">
            {trend}
          </div>
        )}
      </div>
    );
  };

  const BillingOverviewCards = ({ analytics }: { analytics: BillingAnalytics }) => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <BillingMetricsCard
          icon={<DollarSign className="w-6 h-6 text-green-600" />}
          title="Total Revenue"
          value={formatCurrency(analytics.totalRevenue)}
          trend="+12.5% from last month"
          className="bg-white border-green-200"
        />
        
        <BillingMetricsCard
          icon={<FileText className="w-6 h-6 text-orange-600" />}
          title="Pending Invoices"
          value={analytics.pendingInvoices.toString()}
          trend={formatCurrency(analytics.pendingAmount)}
          className="bg-white border-orange-200"
        />
        
        <BillingMetricsCard
          icon={<Receipt className="w-6 h-6 text-gold" />}
          title="Total Receipts"
          value={analytics.totalReceipts.toString()}
          trend="This month"
          className="bg-white border-hud-border-accent"
        />
        
        <BillingMetricsCard
          icon={<TrendingUp className="w-6 h-6 text-tactical-gold" />}
          title="This Month"
          value={formatCurrency(analytics.currentMonthRevenue)}
          trend="vs last month"
          className="bg-white border-tactical-grey-300"
        />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tactical-gold-600"></div>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="text-center p-8">
        <div className="max-w-md mx-auto">
          <h2 className="text-xl font-semibold text-tactical-grey-800 mb-4">Client Not Found</h2>
          <p className="text-tactical-grey-500 mb-4">Unable to load client data for ID: {clientId}</p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left">
            <h3 className="font-medium text-yellow-800 mb-2">Diagnostic Information:</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Client ID: <code className="bg-yellow-100 px-1 rounded">{clientId}</code></li>
              <li>• Check browser console for detailed error logs</li>
              <li>• Verify the client exists in the database</li>
              <li>• Ensure the API endpoint is accessible</li>
            </ul>
          </div>
          <button
            onClick={fetchClientData}
            className="mt-4 px-4 py-2 bg-tactical-gold text-white rounded hover:bg-tactical-gold-dark"
          >
            Retry Loading
          </button>
        </div>
      </div>
    )
  }

  // At this point, client is guaranteed to be non-null
  const serviceLineGroups = {
    contracts: groupByServiceLine(client.serviceContracts, 'contracts'),
    records: groupByServiceLine(client.serviceRecords, 'service records'),
    billing: groupByServiceLine(client.billingRecords, 'billing records')
  }

  // Fix service lines deduplication - use Map to properly deduplicate by ID
  const serviceLineMap = new Map<string, ServiceLine>()
  
  // Add service lines from all sources
  client.serviceContracts.forEach(c => {
    const line = (c as any).serviceLine as ServiceLine | undefined
    if (line) serviceLineMap.set(line.id, line)
  })
  client.serviceRecords.forEach(r => {
    const line = (r as any).serviceLine as ServiceLine | undefined
    if (line) serviceLineMap.set(line.id, line)
  })
  client.billingRecords.forEach(b => {
    if (b.serviceLine) serviceLineMap.set(b.serviceLine.id, b.serviceLine)
  })
  
  const serviceLines = Array.from(serviceLineMap.values())
  
  // Debug service lines array
  console.log('🔍 DEBUG: Service Lines Array', serviceLines)
  serviceLines.forEach((serviceLine, index) => {
    console.log(`  ${index + 1}. ${serviceLine.name} (${serviceLine.id}) - Color: ${serviceLine.color}`)
  })

  const totalBillingByServiceLine = serviceLines.reduce((totals, serviceLine) => {
    const billingRecords = serviceLineGroups.billing[serviceLine.id] || []
    const total = billingRecords.reduce((sum, record) => sum + record.amount, 0)
    totals[serviceLine.id] = total
    return totals
  }, {} as Record<string, number>)

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="bg-hud-background-secondary p-6 border-b-2 border-hud-border-accent">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-hud-text-primary mb-2 font-primary uppercase tracking-wide">
              SERVICES & BILLING - {client.name.toUpperCase()}
            </h1>
            <p className="text-medium-grey font-primary uppercase tracking-wider text-sm">
              Manage receipts and transactions for this client
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button 
              onClick={() => setShowCreateModal(true)}
              size="sm"
              className="bg-tactical-gold hover:bg-tactical-gold-dark text-hud-text-primary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Receipt
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-tactical-grey-200 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'overview' ? 'bg-white text-tactical-gold shadow-sm' : 'text-tactical-grey-500 hover:text-tactical-grey-800'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('services')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'services' ? 'bg-white text-tactical-gold shadow-sm' : 'text-tactical-grey-500 hover:text-tactical-grey-800'
          }`}
        >
          Service History
        </button>
        <button
          onClick={() => setActiveTab('billing')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'billing' ? 'bg-white text-tactical-gold shadow-sm' : 'text-tactical-grey-500 hover:text-tactical-grey-800'
          }`}
        >
          Billing & Invoices
        </button>
      </div>

      {/* Service Line Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedServiceLine(null)}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
            selectedServiceLine === null 
              ? 'bg-tactical-gold-muted text-tactical-brown-dark' 
              : 'bg-tactical-grey-200 text-tactical-grey-500 hover:bg-tactical-grey-300'
          }`}
        >
          All Service Lines
        </button>
        {serviceLines.map((serviceLine) => (
          <button
            key={serviceLine.id}
            onClick={() => setSelectedServiceLine(serviceLine.id)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              selectedServiceLine === serviceLine.id
                ? 'text-white'
                : 'bg-tactical-grey-200 text-tactical-grey-500 hover:bg-tactical-grey-300'
            }`}
            style={{
              backgroundColor: selectedServiceLine === serviceLine.id ? serviceLine.color : undefined
            }}
          >
            {serviceLine.name}
          </button>
        ))}
      </div>

      {/* Content based on active tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Service Lines Overview */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-semibold">Service Lines Overview</h2>
            {serviceLines
              .filter(serviceLine => !selectedServiceLine || serviceLine.id === selectedServiceLine)
              .map((serviceLine) => {
                const contracts = serviceLineGroups.contracts[serviceLine.id] || []
                const records = serviceLineGroups.records[serviceLine.id] || []
                const billing = serviceLineGroups.billing[serviceLine.id] || []
                const totalBilled = totalBillingByServiceLine[serviceLine.id] || 0

                return (
                  <Card key={serviceLine.id} className="border-l-4" style={{ borderLeftColor: serviceLine.color }}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{serviceLine.name}</CardTitle>
                        <Badge 
                          variant="secondary"
                          style={{ backgroundColor: `${serviceLine.color}20`, color: serviceLine.color }}
                        >
                          {serviceLine.slug}
                        </Badge>
                      </div>
                      <p className="text-sm text-tactical-grey-500">{serviceLine.description}</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Active Contracts */}
                      {contracts.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm text-tactical-grey-600 mb-2">Active Contracts</h4>
                          {contracts.map((contract) => (
                            <div key={contract.id} className="flex items-center justify-between p-3 bg-tactical-grey-100 rounded-lg">
                              <div>
                                <p className="font-medium">{contract.serviceName}</p>
                                <p className="text-sm text-tactical-grey-500">{contract.period} • {contract.frequency}</p>
                                {contract.isPrimary && (
                                  <Badge variant="outline" className="mt-1">Primary Service</Badge>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="font-medium">{formatCurrency(contract.contractValue)}</p>
                                <Badge className={getStatusColor(contract.status)}>{contract.status}</Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Recent Services */}
                      {records.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm text-tactical-grey-600 mb-2">Recent Services</h4>
                          <div className="space-y-2">
                            {records.slice(0, 3).map((record) => (
                              <div key={record.id} className="flex items-center justify-between text-sm">
                                <div>
                                  <span className="font-medium">{record.serviceType.replace('_', ' ')}</span>
                                  <span className="text-tactical-grey-500 ml-2">{formatDate(record.serviceDate)}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span>{formatCurrency(record.amount)}</span>
                                  <Badge className={getStatusColor(record.completionStatus)}>
                                    {record.completionStatus}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Billing Summary */}
                      <div className="pt-3 border-t">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-tactical-grey-600">Total Billed</span>
                          <span className="text-lg font-semibold" style={{ color: serviceLine.color }}>
                            {formatCurrency(totalBilled)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
          </div>

          {/* Summary Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Account Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-tactical-grey-500">Active Contracts</span>
                  <span className="font-medium">{client.serviceContracts.filter(c => c.isActive).length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-tactical-grey-500">Service Records</span>
                  <span className="font-medium">{client.serviceRecords.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-tactical-grey-500">Total Invoiced</span>
                  <span className="font-medium">
                    {formatCurrency(client.billingRecords.reduce((sum, b) => sum + b.amount, 0))}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-tactical-grey-500">Service Lines</span>
                  <span className="font-medium">{serviceLines.length}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Invoice
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <CalendarDays className="w-4 h-4 mr-2" />
                  Schedule Service
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Settings className="w-4 h-4 mr-2" />
                  Service Settings
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'services' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Service History</h2>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Service Record
            </Button>
          </div>
          
          {serviceLines
            .filter(serviceLine => !selectedServiceLine || serviceLine.id === selectedServiceLine)
            .map((serviceLine) => {
              const records = serviceLineGroups.records[serviceLine.id] || []
              
              if (records.length === 0) return null
              
              return (
                <Card key={serviceLine.id} className="border-l-4" style={{ borderLeftColor: serviceLine.color }}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{serviceLine.name}</span>
                      <Badge variant="outline">{records.length} services</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {records.map((record) => (
                        <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">{record.serviceType.replace('_', ' ')}</span>
                              <Badge className={getStatusColor(record.completionStatus)}>
                                {record.completionStatus}
                              </Badge>
                            </div>
                            <p className="text-sm text-tactical-grey-500">{record.serviceArea}</p>
                            <p className="text-sm text-tactical-grey-500">{formatDate(record.serviceDate)}</p>
                            {record.notes && (
                              <p className="text-sm text-tactical-grey-500 italic">{record.notes}</p>
                            )}
                          </div>
                          <div className="text-right space-y-1">
                            <p className="font-medium">{formatCurrency(record.amount)}</p>
                            <Badge className={getStatusColor(record.billingStatus)}>
                              {record.billingStatus}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
        </div>
      )}

      {activeTab === 'billing' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Receipts & Transactions</h2>
            <Button 
              size="sm"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Receipt
            </Button>
          </div>

          {/* Analytics Overview */}
          <BillingOverviewCards analytics={analytics} />
          
          {/* Search and Filter Bar */}
          <div className="bg-white border-2 border-hud-border p-6">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
              <div className="flex items-center space-x-2">
                <Search className="w-4 h-4 text-medium-grey" />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={filters.searchTerm}
                  onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                  className="px-3 py-2 border border-hud-border focus:border-hud-border-accent focus:ring-1 focus:ring-gold font-primary text-sm"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-medium-grey" />
                <select
                  value={filters.transactionType}
                  onChange={(e) => setFilters({ ...filters, transactionType: e.target.value as any })}
                  className="px-3 py-2 border border-hud-border focus:border-hud-border-accent focus:ring-1 focus:ring-gold font-primary text-sm"
                >
                  <option value="all">All Transactions</option>
                  <option value="receipts">Receipts Only</option>
                  <option value="invoices">Invoices Only</option>
                </select>
              </div>
            </div>
          </div>

          {loadingTransactions ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-tactical-gold-600"></div>
              <span className="ml-2">Loading receipts...</span>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center p-8">
              <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-tactical-grey-800 mb-2">No receipts found</h3>
              <p className="text-tactical-grey-500 mb-4">This client doesn't have any receipts yet.</p>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Receipt
              </Button>
            </div>
          ) : (
            <div className="bg-white rounded-lg border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full divide-y divide-gray-200">
                  <thead className="bg-tactical-grey-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-tactical-grey-500 uppercase tracking-wider">
                        Receipt
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-tactical-grey-500 uppercase tracking-wider">
                        Service
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-tactical-grey-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-tactical-grey-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-tactical-grey-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-tactical-grey-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredTransactions.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-tactical-grey-100">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-tactical-grey-800">
                            {transaction.receiptNumber}
                          </div>
                          <div className="text-sm text-tactical-grey-500">
                            {transaction.description}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-tactical-grey-800">
                            {transaction.serviceType || 'General'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-tactical-grey-800">
                            ${transaction.amount.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <div>
                              {transaction.emailSentAt || transaction.status === 'sent' ? (
                                <span className="flex items-center text-xs text-green-600">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Sent
                                </span>
                              ) : (
                                <span className="flex items-center text-xs text-tactical-grey-500">
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Not Sent
                                </span>
                              )}
                            </div>
                            <div>
                              {transaction.status === 'paid' ? (
                                <span className="flex items-center text-xs text-green-600">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Paid
                                </span>
                              ) : (
                                <span className="flex items-center text-xs text-tactical-grey-500">
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Unpaid
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-tactical-grey-500">
                          {new Date(transaction.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            {!transaction.emailSentAt && transaction.status !== 'sent' ? (
                              <>
                                <button
                                  onClick={() => handleEditReceipt(transaction)}
                                  className="p-1 text-tactical-gold hover:text-tactical-brown-dark"
                                  title="Edit Receipt"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                {transaction.status === 'paid' ? (
                                  <button
                                    onClick={() => handleSendReceipt(transaction)}
                                    className="p-1 text-green-600 hover:text-green-800"
                                    title="Send Receipt"
                                    disabled={sendingReceiptId === transaction.id}
                                  >
                                    <Send className="w-4 h-4" />
                                  </button>
                                ) : (
                                  <button
                                    disabled
                                    className="p-1 text-gray-400 cursor-not-allowed opacity-50"
                                    title="Cannot send unpaid receipts - Mark as paid first"
                                  >
                                    <Send className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteReceipt(transaction)}
                                  className="p-1 text-red-600 hover:text-red-800"
                                  title="Delete Receipt"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            ) : transaction.emailSentAt || transaction.status === 'sent' ? (
                              <>
                                <button
                                  onClick={() => handleViewReceipt(transaction)}
                                  className="p-1 text-tactical-gold hover:text-tactical-brown-dark"
                                  title="View Receipt"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  disabled
                                  className="p-1 text-gray-400 cursor-not-allowed opacity-50"
                                  title="Cannot delete sent receipts - Archive instead"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                                <span className="text-xs text-tactical-grey-500 bg-tactical-grey-200 px-2 py-1 rounded">
                                  🔒 Sent
                                </span>
                              </>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Receipt Modals */}
      {showReceiptModal && selectedReceipt && client && (
        <ReceiptDetailsModal
          isOpen={showReceiptModal}
          onClose={() => {
            setShowReceiptModal(false);
            setSelectedReceipt(null);
          }}
          client={client as unknown as ClientType}
          receipt={{
            id: selectedReceipt.id,
            receiptNumber: selectedReceipt.receiptNumber || '',
            client: {
              id: client.id,
              name: client.name,
              email: client.email || '',
              phone: client.phone || '',
              address: {
                street: client.address?.street || '',
                city: client.address?.city || '',
                state: client.address?.state || '',
                country: client.address?.country || '',
                zip: client.address?.zip || ''
              }
            },
            items: [],
            subtotal: selectedReceipt.amount,
            taxAmount: 0,
            totalAmount: selectedReceipt.amount,
            paymentMethod: 'cash' as const,
            paymentDate: new Date(selectedReceipt.date),
            serviceDate: new Date(selectedReceipt.date),
            status: selectedReceipt.status,
            notes: selectedReceipt.description || '',
            createdAt: new Date(selectedReceipt.date),
            updatedAt: new Date(selectedReceipt.date),
            conversationId: undefined
          } as any}
          onUpdate={handleReceiptUpdate}
          onEmailSent={() => loadTransactions()}
        />
      )}

      <CreateReceiptModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onReceiptCreated={handleReceiptCreated}
      />

      {showEditModal && editingReceipt && (
        <CreateReceiptModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingReceipt(null);
          }}
          onReceiptCreated={handleReceiptUpdate}
          editMode={true}
          existingReceiptId={editingReceipt.id}
        />
      )}
      </div>
    </div>
  )
}

export default ClientServicesBilling