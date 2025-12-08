"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import CRMLayout from '@/components/CRMLayout'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Plus, Edit2, Trash2, DollarSign, Users, CheckCircle, TrendingUp } from 'lucide-react'

interface ServiceLine {
  id: string
  name: string
  route: string
  icon: string
  color: string
  metrics?: {
    revenue: number
    activeClients: number
    completionRate: number
  }
}

const ServiceLinesPage = () => {
  const router = useRouter()
  const [serviceLines, setServiceLines] = useState<ServiceLine[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newServiceLine, setNewServiceLine] = useState({ name: '', route: '' })

  useEffect(() => {
    fetchServiceLines()
  }, [])

  const fetchServiceLines = async () => {
    try {
      const response = await fetch('/api/service-lines')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setServiceLines(data.data)
        }
      }
    } catch (error) {
      console.error('Error fetching service lines:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddServiceLine = async () => {
    if (!newServiceLine.name || !newServiceLine.route) {
      alert('Please fill in all fields')
      return
    }

    try {
      const response = await fetch('/api/service-lines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newServiceLine)
      })

      if (response.ok) {
        setShowAddForm(false)
        setNewServiceLine({ name: '', route: '' })
        fetchServiceLines()
      }
    } catch (error) {
      console.error('Error adding service line:', error)
    }
  }

  const handleDeleteServiceLine = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service line?')) return

    try {
      const response = await fetch(`/api/service-lines?id=${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchServiceLines()
      }
    } catch (error) {
      console.error('Error deleting service line:', error)
    }
  }

  const generateRouteFromName = (name: string) => {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  }

  return (
    <CRMLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Service Lines Management</h1>
            <p className="text-muted-foreground text-sm">Manage your business service lines</p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="neo-button flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Service Line</span>
          </button>
        </div>

        {showAddForm && (
          <Card className="neo-card mb-6">
            <CardHeader>
              <h3 className="text-lg font-semibold">Add New Service Line</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Service Line Name</label>
                  <input
                    type="text"
                    value={newServiceLine.name}
                    onChange={(e) => {
                      const name = e.target.value
                      setNewServiceLine({
                        name,
                        route: generateRouteFromName(name)
                      })
                    }}
                    className="neo-input w-full px-3 py-2"
                    placeholder="e.g., Landscaping Services"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">URL Route</label>
                  <input
                    type="text"
                    value={newServiceLine.route}
                    onChange={(e) => setNewServiceLine({ ...newServiceLine, route: e.target.value })}
                    className="neo-input w-full px-3 py-2"
                    placeholder="e.g., landscaping"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    URL: /services/{newServiceLine.route || 'your-route'}
                  </p>
                </div>
                <div className="flex space-x-3">
                  <button onClick={handleAddServiceLine} className="neo-button">
                    Create Service Line
                  </button>
                  <button
                    onClick={() => {
                      setShowAddForm(false)
                      setNewServiceLine({ name: '', route: '' })
                    }}
                    className="neo-button"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading service lines...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {serviceLines.map((serviceLine) => (
              <div key={serviceLine.id} className="neo-container p-6 hover:scale-[1.02] transition-transform duration-200">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-foreground uppercase tracking-wide font-primary">{serviceLine.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">/services/{serviceLine.route}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => router.push(`/services/${serviceLine.route}`)}
                      className="neo-button-sm p-2"
                      title="View Service Line"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteServiceLine(serviceLine.id)}
                      className="neo-button-sm p-2 text-red-600 hover:text-red-700"
                      title="Delete Service Line"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {serviceLine.metrics && (
                  <div className="space-y-3">
                    <div className="neo-inset p-3 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="neo-container p-2 rounded-lg">
                            <DollarSign className="h-4 w-4 text-green-600" />
                          </div>
                          <span className="text-sm font-medium text-foreground">Revenue</span>
                        </div>
                        <span className="text-sm font-bold text-foreground">
                          ${serviceLine.metrics.revenue.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="neo-inset p-3 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="neo-container p-2 rounded-lg">
                            <Users className="h-4 w-4 text-blue-600" />
                          </div>
                          <span className="text-sm font-medium text-foreground">Active Clients</span>
                        </div>
                        <span className="text-sm font-bold text-foreground">
                          {serviceLine.metrics.activeClients}
                        </span>
                      </div>
                    </div>
                    <div className="neo-inset p-3 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="neo-container p-2 rounded-lg">
                            <CheckCircle className="h-4 w-4 text-purple-600" />
                          </div>
                          <span className="text-sm font-medium text-foreground">Completion Rate</span>
                        </div>
                        <span className="text-sm font-bold text-foreground">
                          {serviceLine.metrics.completionRate}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!isLoading && serviceLines.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No service lines yet</p>
            <button onClick={() => setShowAddForm(true)} className="neo-button flex items-center justify-center mx-auto">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Service Line
            </button>
          </div>
        )}
      </div>
    </CRMLayout>
  )
}

export default ServiceLinesPage
