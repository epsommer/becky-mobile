"use client"

import React from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { DollarSign, Users, CheckCircle, TrendingUp, Target, Calendar, Clock, Mail, Phone, FileText, Calculator, Receipt, ScrollText, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import CRMLayout from '@/components/CRMLayout'
import DailyPlannerWidget from '@/components/DailyPlannerWidget'
import GoalsWidget from '@/components/GoalsWidget'
import TestimonialsWidget from '@/components/TestimonialsWidget'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getAllServices } from '@/lib/service-config'
import { useGoals } from '@/hooks/useGoals'
import { Client } from '@/types/client'
import { getDataColor, getGrowthColor, getCompletionColor, getSimulatedHistoricalData } from '@/lib/data-colors'

interface AnalyticsMetrics {
  revenue: {
    total: number;
    previous: number;
    pipeline: number;
    growth: number;
  };
  clients: {
    total: number;
    active: number;
    prospects: number;
    previous: number;
    growth: number;
  };
  growth: {
    rate: number;
    revenueGrowth: number;
    clientGrowth: number;
  };
}

const Dashboard = () => {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [allClients, setAllClients] = useState<Client[]>([])
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null)
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true)
  const [derivedRevenue, setDerivedRevenue] = useState(0)
  const [derivedPipeline, setDerivedPipeline] = useState(0)
  const [recentTransactions, setRecentTransactions] = useState<Array<{
    id: string
    type: 'receipt' | 'invoice'
    number: string
    clientName: string
    amount: number
    status: string
    date: number
    serviceLine?: string | null
  }>>([])
  const [serviceLineTotals, setServiceLineTotals] = useState<Record<string, { revenue: number; active: number }>>({})
  const services = getAllServices()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch clients and metrics in parallel
        const [clientsResponse, metricsResponse] = await Promise.all([
          fetch('/api/clients?limit=100'),
          fetch('/api/analytics/metrics'),
        ])

        // Handle clients data
        let clientsList: Client[] = []
        if (clientsResponse.ok) {
          const data = await clientsResponse.json()
          console.log('📥 Dashboard fetched clients:', data)

          if (data.success && Array.isArray(data.data)) {
            clientsList = data.data
            setAllClients(data.data)
          } else if (Array.isArray(data)) {
            clientsList = data
            setAllClients(data)
          } else {
            console.error('Unexpected clients data format:', data)
            setAllClients([])
          }
        } else {
          console.error('Failed to fetch clients for dashboard')
          setAllClients([])
        }

        // Handle metrics data
        let metricsValue: AnalyticsMetrics | null = null
        if (metricsResponse.ok) {
          const metricsData = await metricsResponse.json()
          console.log('📊 Dashboard fetched metrics:', metricsData)

          if (metricsData.success) {
            metricsValue = metricsData.data
          }
        } else {
          console.error('Failed to fetch metrics for dashboard')
        }

        // Fetch receipts and invoices for revenue fallback + recent list
        let receipts: any[] = []
        let invoices: any[] = []
        const normalizeServiceKey = (raw: any) => {
          if (!raw) return 'unknown'
          const cleaned = String(raw).trim().toLowerCase()
          const compact = cleaned.replace(/[\s_-]+/g, '')
          const match = services.find((s) => s.id === cleaned || s.id === compact)
          if (match) return match.id
          if (compact.includes('wood')) return 'woodgreen'
          if (compact.includes('white')) return 'whiteknight'
          if (compact.includes('pup')) return 'pupawalk'
          if (compact.includes('creative') || compact.includes('evangelo') || compact.includes('studio') || compact.includes('tommy')) return 'creative'
          return cleaned || 'unknown'
        }

        try {
          const [receiptsRes, invoicesRes] = await Promise.all([
            fetch('/api/billing/receipts'),
            fetch('/api/billing/invoices'),
          ])
          if (receiptsRes.ok) {
            const data = await receiptsRes.json()
            receipts = Array.isArray(data) ? data : data.receipts || data.data || []
          }
          if (invoicesRes.ok) {
            const data = await invoicesRes.json()
            invoices = Array.isArray(data) ? data : data.invoices || data.data || []
          }
        } catch (err) {
          console.error('Failed to fetch receipts/invoices for dashboard:', err)
        }

        // Map recent transactions from both receipts and invoices
        const mappedReceipts = receipts.map((r: any) => ({
          id: r.id,
          type: 'receipt' as const,
          number: r.receiptNumber || `REC-${(r.id || '').slice(-6).toUpperCase()}`,
          clientName: r.client?.name || 'Client',
          amount: r.totalAmount || r.amount || 0,
          status: (r.status || '').toLowerCase(),
          date: new Date(r.createdAt || r.serviceDate || Date.now()).getTime(),
          serviceLine: normalizeServiceKey(
            r.serviceLineId ||
            r.serviceLine ||
            r.serviceType ||
            r.items?.[0]?.serviceType ||
            r.items?.[0]?.serviceTitle
          ),
        }))

        const mappedInvoices = invoices.map((inv: any) => ({
          id: inv.id,
          type: 'invoice' as const,
          number: inv.invoiceNumber || `INV-${(inv.id || '').slice(-6).toUpperCase()}`,
          clientName: inv.client?.name || 'Client',
          amount: inv.totalAmount || inv.amount || 0,
          status: (inv.status || '').toLowerCase(),
          date: new Date(inv.createdAt || inv.dueDate || Date.now()).getTime(),
          serviceLine: normalizeServiceKey(
            inv.serviceLineId ||
            inv.serviceLine ||
            inv.serviceType ||
            inv.items?.[0]?.serviceType ||
            inv.items?.[0]?.serviceTitle
          ),
        }))

        const combinedRecent = [...mappedReceipts, ...mappedInvoices]
          .sort((a, b) => b.date - a.date)
          .slice(0, 5)

        setRecentTransactions(combinedRecent)

        // Derive revenue/pipeline from receipts+invoices (always used for totals)
        const paidTotal =
          [...mappedReceipts, ...mappedInvoices]
            .filter((t) => t.status === 'paid')
            .reduce((sum, t) => sum + (t.amount || 0), 0)

        const pipelineTotal =
          [...mappedReceipts, ...mappedInvoices]
            .filter((t) => t.status === 'sent' || t.status === 'draft')
            .reduce((sum, t) => sum + (t.amount || 0), 0)

        // Service-line totals from paid receipts/invoices
        const serviceTotals: Record<string, { revenue: number; active: number }> = {}
        ;[...mappedReceipts, ...mappedInvoices]
          .filter((t) => t.status === 'paid')
          .forEach((t) => {
            const key = normalizeServiceKey((t as any).serviceLine)
            if (!serviceTotals[key]) {
              serviceTotals[key] = { revenue: 0, active: 0 }
            }
            serviceTotals[key].revenue += t.amount || 0
            serviceTotals[key].active += 1
          })
        setServiceLineTotals(serviceTotals)

        setDerivedRevenue(paidTotal)
        setDerivedPipeline(pipelineTotal)

        // Merge or create metrics with derived revenue
        const totalClients = clientsList.length
        const activeClients = clientsList.filter(c => c.status?.toLowerCase() === 'active').length
        const prospects = clientsList.filter(c => c.status?.toLowerCase() === 'prospect').length

        if (!metricsValue) {
          metricsValue = {
            revenue: {
              total: paidTotal,
              previous: 0,
              pipeline: pipelineTotal,
              growth: 0,
            },
            clients: {
              total: totalClients,
              active: activeClients,
              prospects: prospects,
              previous: 0,
              growth: 0,
            },
            growth: {
              rate: 0,
              revenueGrowth: 0,
              clientGrowth: 0,
            },
          }
        } else {
          metricsValue = {
            ...metricsValue,
            revenue: {
              ...metricsValue.revenue,
              total: paidTotal,
              pipeline: pipelineTotal,
            },
            clients: {
              ...metricsValue.clients,
              total: totalClients,
              active: activeClients,
              prospects: prospects,
            },
          }
        }

        if (metricsValue) {
          setMetrics(metricsValue)
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
        setAllClients([])
      } finally {
        setIsLoadingMetrics(false)
      }
    }

    fetchData()
  }, [])

  if (status === "loading") {
    return (
      <CRMLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-foreground/20 border-t-transparent animate-spin mx-auto mb-4 rounded-full"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </CRMLayout>
    )
  }

  if (status === "unauthenticated") {
    return null
  }

  // Use derived data primarily, fallback to metrics if missing
  const totalRevenue = derivedRevenue || metrics?.revenue?.total || 0
  const pipelineValue = derivedPipeline || metrics?.revenue?.pipeline || 0
  const activeClients = metrics?.clients.active || allClients.filter((c) => c.status === "active").length
  const totalClients = metrics?.clients.total || allClients.length
  const prospects = metrics?.clients.prospects || allClients.filter((c) => c.status === "prospect").length
  const growthRate = metrics?.growth.rate || 0

  const recentClients = allClients
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)

  // Calculate data-driven colors based on performance
  const revenueColor = getDataColor(totalRevenue, metrics?.revenue.previous || 0)
  const clientsColor = getDataColor(activeClients, metrics?.clients.previous || 0)
  const prospectsColor = getDataColor(prospects, metrics?.clients.previous || 0)
  const growthColor = getGrowthColor(growthRate)

  return (
    <CRMLayout>
      <div className="p-6 space-y-6">
        {/* Dashboard Header */}
        <div className="neo-card p-6 mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Dashboard Overview
          </h1>
          <p className="text-muted-foreground text-sm">
            Welcome back, {session?.user?.email?.split('@')[0]}
          </p>
        </div>

        {/* KPI Cards - 4 Primary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Revenue - Links to Billing Page */}
          <Link href="/billing">
            <div className="neo-card p-6 cursor-pointer hover:shadow-lg transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-muted-foreground">
                  Total Revenue
                </span>
                <div className="neo-button-circle w-8 h-8 flex items-center justify-center">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              {isLoadingMetrics ? (
                <div className="text-3xl font-bold text-muted-foreground mb-1 animate-pulse">
                  ---
                </div>
              ) : (
                <div className={`text-3xl font-bold status-green mb-1`} title="Paid receipts + paid invoices">
                  ${totalRevenue.toLocaleString()}
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                ${pipelineValue.toLocaleString()} Pipeline
              </div>
            </div>
          </Link>

          {/* Active Clients - Links to Clients Page */}
          <Link href="/clients">
            <div className="neo-card p-6 cursor-pointer hover:shadow-lg transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-muted-foreground">
                  Active Clients
                </span>
                <div className="neo-button-circle w-8 h-8 flex items-center justify-center">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              {isLoadingMetrics ? (
                <div className="text-3xl font-bold text-muted-foreground mb-1 animate-pulse">
                  ---
                </div>
              ) : (
                <div className={`text-3xl font-bold ${clientsColor.class} mb-1`} title={clientsColor.description}>
                  {activeClients}
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                of {totalClients} total
              </div>
            </div>
          </Link>

          {/* Prospects - Links to Clients Page */}
          <Link href="/clients">
            <div className="neo-card p-6 cursor-pointer hover:shadow-lg transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-muted-foreground">
                  Prospects
                </span>
                <div className="neo-button-circle w-8 h-8 flex items-center justify-center">
                  <CheckCircle className="h-4 w-4" />
                </div>
              </div>
              {isLoadingMetrics ? (
                <div className="text-3xl font-bold text-muted-foreground mb-1 animate-pulse">
                  ---
                </div>
              ) : (
                <div className={`text-3xl font-bold ${prospectsColor.class} mb-1`} title={prospectsColor.description}>
                  {prospects}
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                Potential Clients
              </div>
            </div>
          </Link>

          {/* Growth Rate - Informational Only */}
          <div className="neo-card p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-muted-foreground">
                Growth Rate
              </span>
              <div className="neo-button-circle w-8 h-8 flex items-center justify-center">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            {isLoadingMetrics ? (
              <div className="text-3xl font-bold text-muted-foreground mb-1 animate-pulse">
                ---
              </div>
            ) : (
              <div className={`text-3xl font-bold ${growthColor.class} mb-1`} title={growthColor.description}>
                {growthRate >= 0 ? '+' : ''}{growthRate.toFixed(1)}%
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              Year Over Year
            </div>
          </div>
        </div>

        
        {/* Masonry layout for widgets */}
        <div className="columns-1 md:columns-2 xl:columns-3 gap-6 space-y-6 [column-fill:_balance]">
          <div className="break-inside-avoid-column mb-6">
            <DailyPlannerWidget onViewAll={() => router.push('/time-manager')} />
          </div>
          <div className="break-inside-avoid-column mb-6">
            <GoalsWidget onViewAll={() => router.push('/goals')} />
          </div>
          <div className="break-inside-avoid-column mb-6">
            <TestimonialsWidget onViewAll={() => router.push('/testimonials')} />
          </div>
          <div className="break-inside-avoid-column mb-6">
            <div className="neo-card flex flex-col w-full">
              <div className="p-6 border-b border-border flex-shrink-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-foreground">
                    Recent Transactions
                  </h3>
                  <Link href="/billing">
                    <button className="neo-button text-xs px-3 py-1">
                      Go to Billing
                    </button>
                  </Link>
                </div>
              </div>
              <div className="p-6 flex-grow flex flex-col">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center neo-card p-3">
                      {isLoadingMetrics ? (
                        <div className="text-2xl font-bold text-muted-foreground animate-pulse">
                          ---
                        </div>
                      ) : (
                        <div className="text-2xl font-bold status-green">
                          ${(metrics?.revenue.total || 0).toLocaleString()}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        Total Revenue
                      </div>
                    </div>
                    <div className="text-center neo-card p-3">
                      {isLoadingMetrics ? (
                        <div className="text-2xl font-bold text-muted-foreground animate-pulse">
                          ---
                        </div>
                      ) : (
                        <div className="text-2xl font-bold text-orange-600">
                          ${(metrics?.revenue.pipeline || 0).toLocaleString()}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        Pipeline Value
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground">
                      Recent Transactions
                    </h4>
                    <div className="space-y-2">
                      {recentTransactions.length === 0 && (
                        <div className="neo-card p-3 text-sm text-muted-foreground">
                          No recent transactions
                        </div>
                      )}
                      {recentTransactions.map((txn) => {
                        const isPaid = txn.status === 'paid';
                        const isSent = txn.status === 'sent';
                        const statusClass = isPaid || isSent ? 'status-green' : 'text-orange-600';
                        const Icon = txn.type === 'invoice' ? FileText : Receipt;
                        return (
                          <div key={txn.id} className="flex items-center justify-between p-3 neo-card">
                            <div className="flex items-center space-x-2">
                              <Icon className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <div className="text-sm text-foreground">{txn.number}</div>
                                <div className="text-xs text-muted-foreground">{txn.clientName}</div>
                              </div>
                            </div>
                            <div className={`text-sm font-bold ${statusClass}`}>
                              ${txn.amount.toLocaleString()}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Link href="/billing">
                      <button className="neo-button w-full text-xs py-2 flex items-center justify-start">
                        <ExternalLink className="w-3 h-3 mr-2" />
                        View Full Billing Page
                      </button>
                    </Link>
                    <button className="neo-button w-full text-xs py-2 flex items-center justify-start">
                      <Receipt className="w-3 h-3 mr-2" />
                      Create Receipt
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="break-inside-avoid-column mb-6">
            <div className="neo-card flex flex-col w-full">
              <div className="p-6 border-b border-border flex-shrink-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-foreground">
                    Recent Clients
                  </h3>
                  <button
                    className="neo-button text-xs px-3 py-1"
                    onClick={() => router.push('/clients')}
                  >
                    View All
                  </button>
                </div>
              </div>
              <div className="p-6 flex-grow flex flex-col">
                {recentClients.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h4 className="text-lg font-bold text-foreground mb-2">
                      No Clients Yet
                    </h4>
                    <p className="text-muted-foreground mb-4">
                      Start by adding your first client to begin tracking relationships.
                    </p>
                    <button
                      className="neo-button px-6 py-2"
                      onClick={() => router.push('/clients/new')}
                    >
                      Add First Client
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentClients.map(client => {
                      const service = services.find(s => s.id === client.serviceId)
                      return (
                        <div
                          key={client.id}
                          className="neo-card p-4 cursor-pointer transition-all hover:shadow-lg"
                          onClick={() => router.push(`/clients/${client.id}`)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="neo-button-circle w-10 h-10 flex items-center justify-center font-bold text-sm">
                                {client.name.split(' ').map(n => n[0]).join('')}
                              </div>
                              <div>
                                <div className="font-bold text-foreground">
                                  {client.name}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {service?.name || 'Unknown Service'}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-foreground">
                                ${(client.budget || 0).toLocaleString()}
                              </div>
                              <div className={`text-xs font-semibold ${
                                client.status === 'active' ? 'status-green' : 'text-muted-foreground'
                              }`}>
                                {client.status?.toUpperCase()}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="break-inside-avoid-column mb-6">
            <div className="neo-card">
              <div className="p-6 border-b border-border">
                <h3 className="text-lg font-bold text-foreground">
                  Service Line Performance
                </h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {services.map(service => {
                    const totals = serviceLineTotals[service.id] || { revenue: 0, active: 0 }
                    const averageServiceRevenue = totalRevenue / (services.length || 1)
                    const serviceRevenueColor = getDataColor(totals.revenue, averageServiceRevenue)

                    return (
                      <div key={service.id} className="text-center neo-card p-4">
                        <div
                          className="w-4 h-4 mx-auto mb-3 rounded-full"
                          style={{ backgroundColor: service.brand.primaryColor }}
                        ></div>
                        <h4 className="font-bold text-foreground text-sm mb-2">
                          {service.name}
                        </h4>
                        <div className="space-y-1">
                          <p className={`text-lg font-bold ${serviceRevenueColor.class}`} title={serviceRevenueColor.description}>
                            ${totals.revenue.toLocaleString()}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {totals.active} paid docs
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CRMLayout>
  )
}

export default Dashboard
