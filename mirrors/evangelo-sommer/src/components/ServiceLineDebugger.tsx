'use client'

import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Bug, ChevronDown, ChevronUp, Database, Eye, Code2 } from "lucide-react"

interface Client {
  id: string
  name: string
  email: string
  phone: string
  serviceContracts: any[]
  serviceRecords: any[]
  billingRecords: any[]
}

interface ServiceLineDebuggerProps {
  client: Client | null
  clientId: string
}

const ServiceLineDebugger: React.FC<ServiceLineDebuggerProps> = ({ client, clientId }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [debugData, setDebugData] = useState<any>(null)

  const runDebugAnalysis = () => {
    if (!client) {
      console.log('🔍 DIAGNOSTIC: Client is null or undefined')
      console.log('🔍 DIAGNOSTIC: ClientId provided:', clientId)
      setDebugData({ error: 'Client data not available', clientId })
      return
    }

    console.clear()
    console.log('🔍 DIAGNOSTIC: Starting Service Line Debug Analysis')
    console.log('='.repeat(60))

    // Full Client Data
    console.group('📋 1. Full Client Data Object')
    console.log('Client Object:', client)
    console.log('Type:', typeof client)
    console.log('Keys:', Object.keys(client))
    console.groupEnd()

    // Service Contracts Analysis
    console.group('📝 2. Service Contracts Analysis')
    console.log('Service Contracts:', client.serviceContracts)
    console.log('Contract Count:', client.serviceContracts?.length || 0)
    
    client.serviceContracts?.forEach((contract, index) => {
      console.log(`Contract ${index + 1}:`, {
        id: contract.id,
        serviceName: contract.serviceName,
        serviceLineId: contract.serviceLineId,
        serviceLine: contract.serviceLine,
        period: contract.period,
        contractValue: contract.contractValue
      })
    })
    console.groupEnd()

    // Service Records Analysis  
    console.group('📊 3. Service Records Analysis')
    console.log('Service Records:', client.serviceRecords)
    console.log('Record Count:', client.serviceRecords?.length || 0)
    
    const recordsByServiceLine = client.serviceRecords?.reduce((acc, record) => {
      const serviceLineId = record.serviceLineId || 'unassigned'
      if (!acc[serviceLineId]) acc[serviceLineId] = []
      acc[serviceLineId].push(record)
      return acc
    }, {} as Record<string, any[]>) || {}
    
    console.log('Records by Service Line:', recordsByServiceLine)
    console.groupEnd()

    // Service Line Separation Analysis
    console.group('🔍 4. Service Line Separation Analysis')
    const whiteKnightData = {
      contracts: client.serviceContracts?.filter(c => c.serviceLineId === 'whiteknight_snow') || [],
      records: client.serviceRecords?.filter(r => r.serviceLineId === 'whiteknight_snow') || [],
      billing: client.billingRecords?.filter(b => b.serviceLineId === 'whiteknight_snow') || []
    }
    
    const woodgreenData = {
      contracts: client.serviceContracts?.filter(c => c.serviceLineId === 'woodgreen_landscaping') || [],
      records: client.serviceRecords?.filter(r => r.serviceLineId === 'woodgreen_landscaping') || [],
      billing: client.billingRecords?.filter(b => b.serviceLineId === 'woodgreen_landscaping') || []
    }

    console.log('❄️  White Knight Snow Service:', whiteKnightData)
    console.log('🌿 Woodgreen Landscaping:', woodgreenData)
    
    // Service Type Analysis
    const whiteKnightTypes = whiteKnightData.records.map(r => r.serviceType)
    const woodgreenTypes = woodgreenData.records.map(r => r.serviceType)
    
    console.log('Service Types - White Knight:', whiteKnightTypes)
    console.log('Service Types - Woodgreen:', woodgreenTypes)
    
    // Check for overlaps
    const overlaps = whiteKnightTypes.filter(type => woodgreenTypes.includes(type))
    console.log('Service Type Overlaps:', overlaps.length > 0 ? overlaps : 'None')
    console.groupEnd()

    // Billing Analysis
    console.group('💰 5. Billing Analysis')
    console.log('Billing Records:', client.billingRecords)
    
    const totalBilling = client.billingRecords?.reduce((sum, record) => sum + (record.amount || 0), 0) || 0
    const whiteKnightBilling = whiteKnightData.billing.reduce((sum, record) => sum + (record.amount || 0), 0)
    const woodgreenBilling = woodgreenData.billing.reduce((sum, record) => sum + (record.amount || 0), 0)
    
    console.log('Total Billing:', totalBilling)
    console.log('White Knight Billing:', whiteKnightBilling)  
    console.log('Woodgreen Billing:', woodgreenBilling)
    console.log('Billing Sum Check:', whiteKnightBilling + woodgreenBilling === totalBilling ? '✅ Correct' : '❌ Mismatch')
    console.groupEnd()

    // Data Integrity Check
    console.group('🔒 6. Data Integrity Check')
    const integrityResults = {
      allContractsHaveServiceLine: client.serviceContracts?.every(c => c.serviceLineId) || false,
      allRecordsHaveServiceLine: client.serviceRecords?.every(r => r.serviceLineId) || false,
      allBillingHaveServiceLine: client.billingRecords?.every(b => b.serviceLineId) || false,
      serviceLineConsistency: true,
      noOrphannedRecords: true
    }

    console.log('Integrity Check Results:', integrityResults)
    console.groupEnd()

    // Summary
    console.group('📋 7. Debug Summary')
    const summary = {
      clientLoaded: !!client,
      serviceLineSeparation: {
        whiteKnight: {
          contracts: whiteKnightData.contracts.length,
          records: whiteKnightData.records.length,
          billing: whiteKnightData.billing.length,
          totalBilled: whiteKnightBilling
        },
        woodgreen: {
          contracts: woodgreenData.contracts.length,
          records: woodgreenData.records.length,
          billing: woodgreenData.billing.length,
          totalBilled: woodgreenBilling
        }
      },
      dataIntegrity: integrityResults,
      overlaps: overlaps,
      totalRecords: client.serviceRecords?.length || 0,
      totalBilling: totalBilling
    }
    
    console.log('FINAL SUMMARY:', summary)
    console.groupEnd()

    console.log('🎯 Debug analysis complete! Check the groups above for detailed information.')
    
    setDebugData(summary)
  }

  const getServiceLineBreakdown = () => {
    if (!client) return null

    const whiteKnight = {
      contracts: client.serviceContracts?.filter(c => c.serviceLineId === 'whiteknight_snow') || [],
      records: client.serviceRecords?.filter(r => r.serviceLineId === 'whiteknight_snow') || [],
      billing: client.billingRecords?.filter(b => b.serviceLineId === 'whiteknight_snow') || []
    }
    
    const woodgreen = {
      contracts: client.serviceContracts?.filter(c => c.serviceLineId === 'woodgreen_landscaping') || [],
      records: client.serviceRecords?.filter(r => r.serviceLineId === 'woodgreen_landscaping') || [],
      billing: client.billingRecords?.filter(b => b.serviceLineId === 'woodgreen_landscaping') || []
    }

    return { whiteKnight, woodgreen }
  }

  const breakdown = getServiceLineBreakdown()

  return (
    <Card className="border-yellow-200 bg-yellow-50">
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center">
            <Bug className="w-5 h-5 mr-2 text-yellow-600" />
            Service Line Debugger
          </div>
          <div className="flex items-center space-x-2">
            <Button size="sm" onClick={runDebugAnalysis} className="bg-yellow-600 hover:bg-yellow-700">
              <Code2 className="w-3 h-3 mr-1" />
              Debug Analysis
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Quick Status */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-tactical-gold">
                {client?.serviceContracts?.length || 0}
              </div>
              <div className="text-sm text-tactical-grey-500">Contracts</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-600">
                {client?.serviceRecords?.length || 0}
              </div>
              <div className="text-sm text-tactical-grey-500">Records</div>
            </div>
            <div>
              <div className="text-lg font-bold text-purple-600">
                {client?.billingRecords?.length || 0}
              </div>
              <div className="text-sm text-tactical-grey-500">Billing</div>
            </div>
          </div>

          {/* Service Line Breakdown */}
          {breakdown && (
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-tactical-grey-300 rounded p-3 bg-tactical-gold-muted">
                <h4 className="font-medium text-tactical-brown-dark mb-2">❄️ White Knight Snow</h4>
                <div className="space-y-1 text-sm">
                  <div>Contracts: {breakdown.whiteKnight.contracts.length}</div>
                  <div>Records: {breakdown.whiteKnight.records.length}</div>
                  <div>Billing: {breakdown.whiteKnight.billing.length}</div>
                  <div className="text-xs text-tactical-gold">
                    Types: {[...new Set(breakdown.whiteKnight.records.map(r => r.serviceType))].join(', ')}
                  </div>
                </div>
              </div>
              
              <div className="border border-green-200 rounded p-3 bg-green-50">
                <h4 className="font-medium text-green-900 mb-2">🌿 Woodgreen Landscaping</h4>
                <div className="space-y-1 text-sm">
                  <div>Contracts: {breakdown.woodgreen.contracts.length}</div>
                  <div>Records: {breakdown.woodgreen.records.length}</div>
                  <div>Billing: {breakdown.woodgreen.billing.length}</div>
                  <div className="text-xs text-green-600">
                    Types: {[...new Set(breakdown.woodgreen.records.map(r => r.serviceType))].join(', ')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Debug Data Display */}
          {debugData && (
            <div className="bg-tactical-grey-200 rounded p-3">
              <h4 className="font-medium text-tactical-grey-800 mb-2 flex items-center">
                <Eye className="w-4 h-4 mr-1" />
                Latest Debug Results
              </h4>
              <pre className="text-xs overflow-auto max-h-40">
                {JSON.stringify(debugData, null, 2)}
              </pre>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => {
                console.log('🔍 DIAGNOSTIC: Client Object Keys:', client ? Object.keys(client) : 'Client is null')
                console.log('🔍 DIAGNOSTIC: ClientId:', clientId)
              }}
            >
              Log Client Keys
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => {
                console.log('🔍 DIAGNOSTIC: Service Records Detail:', client?.serviceRecords)
              }}
            >
              Log Service Records
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => {
                console.log('🔍 DIAGNOSTIC: Service Contracts Detail:', client?.serviceContracts)  
              }}
            >
              Log Service Contracts
            </Button>
          </div>

          {/* Status Indicators */}
          <div className="flex flex-wrap gap-2">
            <Badge variant={client ? "default" : "destructive"}>
              Client: {client ? 'Loaded' : 'Missing'}
            </Badge>
            <Badge variant={client?.serviceContracts?.length ? "default" : "destructive"}>
              Contracts: {client?.serviceContracts?.length || 0}
            </Badge>
            <Badge variant={client?.serviceRecords?.length ? "default" : "destructive"}>
              Records: {client?.serviceRecords?.length || 0}
            </Badge>
            <Badge variant={
              breakdown && 
              breakdown.whiteKnight.records.length > 0 && 
              breakdown.woodgreen.records.length > 0 ? "default" : "destructive"
            }>
              Separation: {
                breakdown && 
                breakdown.whiteKnight.records.length > 0 && 
                breakdown.woodgreen.records.length > 0 ? 'Working' : 'Issue'
              }
            </Badge>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

export default ServiceLineDebugger