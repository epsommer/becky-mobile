'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from 'next/link'
import { ExternalLink, Database, CheckCircle, Clock, DollarSign } from 'lucide-react'

interface Client {
  id: string
  name: string
  email: string
  phone: string
  serviceContracts: number
  serviceRecords: number
  billingRecords: number
  totalBilled: number
}

export default function ServicesBillingDemo() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'running' | 'completed' | 'error'>('idle')

  useEffect(() => {
    checkMigrationStatus()
  }, [])

  const checkMigrationStatus = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/clients/summary')
      if (response.ok) {
        const data = await response.json()
        setClients(data)
        if (data.length > 0) {
          setMigrationStatus('completed')
        }
      } else {
        setMigrationStatus('idle')
      }
    } catch (error) {
      console.error('Error checking migration status:', error)
      setMigrationStatus('error')
    } finally {
      setLoading(false)
    }
  }

  const runMigration = async () => {
    try {
      setMigrationStatus('running')
      const response = await fetch('/api/migrate/mark-levy', {
        method: 'POST'
      })
      
      if (response.ok) {
        setMigrationStatus('completed')
        await checkMigrationStatus() // Refresh the data
      } else {
        throw new Error('Migration failed')
      }
    } catch (error) {
      console.error('Migration error:', error)
      setMigrationStatus('error')
    }
  }

  return (
    <div className="min-h-screen bg-tactical-grey-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-tactical-grey-800 mb-4">
            Client Services & Billing Demo
          </h1>
          <p className="text-xl text-tactical-grey-500 max-w-3xl mx-auto">
            Demonstration of enhanced service line separation and billing tracking for Mark Levy's data recovery project
          </p>
        </div>

        {/* Migration Status Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="w-5 h-5 mr-2" />
              Data Migration Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Mark Levy Service Line Separation</p>
                <p className="text-sm text-tactical-grey-500">
                  Enhanced Prisma schema with service lines for White Knight Snow Service and Woodgreen Landscaping
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {migrationStatus === 'completed' && (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Completed
                  </Badge>
                )}
                {migrationStatus === 'running' && (
                  <Badge className="bg-tactical-gold-muted text-tactical-brown-dark">
                    <Clock className="w-3 h-3 mr-1" />
                    Running...
                  </Badge>
                )}
                {migrationStatus === 'idle' && (
                  <Badge variant="outline">Not Run</Badge>
                )}
                {migrationStatus === 'error' && (
                  <Badge className="bg-red-100 text-red-800">Error</Badge>
                )}
              </div>
            </div>

            {migrationStatus === 'idle' && (
              <Button onClick={runMigration} className="w-full">
                <Database className="w-4 h-4 mr-2" />
                Run Mark Levy Data Migration
              </Button>
            )}

            {migrationStatus === 'running' && (
              <div className="flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tactical-gold-600"></div>
                <span className="ml-3">Running migration...</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Key Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Service Line Separation</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  <div className="w-3 h-3 bg-tactical-gold-muted0 rounded-full mr-2"></div>
                  White Knight Snow Service
                </li>
                <li className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  Woodgreen Landscaping
                </li>
                <li className="text-tactical-grey-500">Clear visual differentiation</li>
                <li className="text-tactical-grey-500">Separate billing tracking</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Enhanced Schema</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li>✅ ServiceLine model</li>
                <li>✅ Enhanced billing tracking</li>
                <li>✅ Service categorization</li>
                <li>✅ Historical data migration</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Service Types</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-tactical-grey-500">
                <li>❄️ Snow Removal</li>
                <li>❄️ Premium Salting</li>
                <li>🌿 Lawn Maintenance</li>
                <li>🌿 Hedge Trimming</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Clients List */}
        {migrationStatus === 'completed' && clients.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Clients with Service Line Data</span>
                <Badge variant="outline">{clients.length} clients</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {clients.map((client) => (
                  <div key={client.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-tactical-grey-100">
                    <div>
                      <h3 className="font-medium">{client.name}</h3>
                      <p className="text-sm text-tactical-grey-500">{client.email} • {client.phone}</p>
                      <div className="flex space-x-4 mt-2 text-sm text-tactical-grey-500">
                        <span>{client.serviceContracts} contracts</span>
                        <span>{client.serviceRecords} service records</span>
                        <span>{client.billingRecords} invoices</span>
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <div className="flex items-center text-green-600">
                        <DollarSign className="w-4 h-4 mr-1" />
                        <span className="font-medium">
                          ${client.totalBilled.toLocaleString()}
                        </span>
                      </div>
                      <Link href={`/clients/${client.id}/services-billing`}>
                        <Button size="sm" variant="outline">
                          <ExternalLink className="w-3 h-3 mr-1" />
                          View Details
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Technical Implementation Details */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Technical Implementation Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">Database Schema Enhancements</h4>
                <ul className="text-sm text-tactical-grey-500 space-y-1">
                  <li>• ServiceLine model with color coding</li>
                  <li>• Enhanced ClientServiceContract with service line links</li>
                  <li>• BillingRecord model for comprehensive tracking</li>
                  <li>• ServiceRecord enhancement with billing details</li>
                  <li>• Strategic indexes for performance</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Data Migration Features</h4>
                <ul className="text-sm text-tactical-grey-500 space-y-1">
                  <li>• Service line separation (White Knight/Woodgreen)</li>
                  <li>• Historical service records creation</li>
                  <li>• Billing records with invoice tracking</li>
                  <li>• Message conversation imports</li>
                  <li>• Data integrity verification</li>
                </ul>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <h4 className="font-medium mb-2">Service Line Breakdown</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-tactical-gold-muted rounded-lg border-l-4 border-tactical-gold-500">
                  <h5 className="font-medium text-tactical-brown-dark">White Knight Snow Service</h5>
                  <p className="text-sm text-tactical-brown-dark">Winter 2024-2025 season</p>
                  <ul className="text-xs text-tactical-gold mt-1">
                    <li>• Snow Removal services</li>
                    <li>• Premium salting (calcium/magnesium mix)</li>
                  </ul>
                </div>
                <div className="p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
                  <h5 className="font-medium text-green-900">Woodgreen Landscaping</h5>
                  <p className="text-sm text-green-700">Bi-weekly throughout Summer 2025</p>
                  <ul className="text-xs text-green-600 mt-1">
                    <li>• Lawn Maintenance services</li>
                    <li>• Hedge trimming and landscaping</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading && (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tactical-gold-600"></div>
            <span className="ml-3">Loading...</span>
          </div>
        )}
      </div>
    </div>
  )
}