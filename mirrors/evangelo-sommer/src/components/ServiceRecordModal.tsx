'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarDays, DollarSign, MapPin, FileText, Save, X, Edit, Eye } from "lucide-react"
import { ServiceType, BillingStatus, CompletionStatus } from '@prisma/client'
import { serviceCategorizer, ServiceLineDefinition } from '@/lib/serviceLineCategorization'

interface ServiceLine {
  id: string
  name: string
  slug: string
  color: string
}

interface ServiceRecord {
  id: string
  serviceLineId?: string
  serviceLine?: ServiceLine
  serviceDate: string
  serviceType: ServiceType
  serviceArea: string
  completionStatus: CompletionStatus
  notes: string
  amount: number
  currency: string
  billingAmount?: number
  billingDate?: string
  billingStatus?: BillingStatus
}

interface ServiceRecordModalProps {
  isOpen: boolean
  onClose: () => void
  serviceRecord?: ServiceRecord
  clientId: string
  mode: 'view' | 'edit' | 'create'
  onSave?: (record: Partial<ServiceRecord>) => Promise<void>
}

const ServiceRecordModal: React.FC<ServiceRecordModalProps> = ({
  isOpen,
  onClose,
  serviceRecord,
  clientId,
  mode,
  onSave
}) => {
  const [formData, setFormData] = useState<Partial<ServiceRecord>>({
    serviceLineId: '',
    serviceDate: new Date().toISOString().split('T')[0],
    serviceType: 'LAWN_CARE',
    serviceArea: '',
    completionStatus: 'SCHEDULED',
    notes: '',
    amount: 0,
    currency: 'CAD',
    billingAmount: 0,
    billingDate: '',
    billingStatus: 'PENDING'
  })
  
  const [availableServiceLines, setAvailableServiceLines] = useState<ServiceLineDefinition[]>([])
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [suggestedServiceLine, setSuggestedServiceLine] = useState<ServiceLineDefinition | null>(null)

  useEffect(() => {
    // Load available service lines
    setAvailableServiceLines(serviceCategorizer.getAllServiceLines())
    
    // Populate form if editing existing record
    if (serviceRecord && mode !== 'create') {
      setFormData({
        ...serviceRecord,
        serviceDate: serviceRecord.serviceDate.split('T')[0],
        billingDate: serviceRecord.billingDate?.split('T')[0] || ''
      })
    }
  }, [serviceRecord, mode])

  useEffect(() => {
    // Auto-suggest service line based on service type
    if (formData.serviceType) {
      const categorization = serviceCategorizer.categorizeService({
        serviceType: formData.serviceType,
        description: formData.notes,
        date: formData.serviceDate ? new Date(formData.serviceDate) : undefined
      })
      
      if (categorization.primaryMatch) {
        setSuggestedServiceLine(categorization.primaryMatch)
        if (!formData.serviceLineId) {
          setFormData(prev => ({ ...prev, serviceLineId: categorization.primaryMatch!.id }))
        }
      }
    }
  }, [formData.serviceType, formData.notes, formData.serviceDate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    try {
      if (onSave) {
        await onSave(formData)
      }
      onClose()
    } catch (error) {
      console.error('Error saving service record:', error)
      setErrors({ submit: 'Failed to save service record' })
    } finally {
      setLoading(false)
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.serviceType) newErrors.serviceType = 'Service type is required'
    if (!formData.serviceDate) newErrors.serviceDate = 'Service date is required'
    if (!formData.serviceArea) newErrors.serviceArea = 'Service area is required'
    if (!formData.amount || formData.amount <= 0) newErrors.amount = 'Valid amount is required'
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: formData.currency || 'CAD'
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    const colors = {
      SCHEDULED: 'bg-tactical-gold-muted text-tactical-brown-dark',
      IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
      COMPLETED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
      PENDING: 'bg-orange-100 text-orange-800',
      PAID: 'bg-green-100 text-green-800',
      BILLED: 'bg-tactical-gold-muted text-tactical-brown-dark'
    }
    return colors[status as keyof typeof colors] || 'bg-tactical-grey-200 text-tactical-grey-700'
  }

  const isViewMode = mode === 'view'
  const isCreateMode = mode === 'create'

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            {isViewMode ? <Eye className="w-5 h-5 mr-2" /> : <Edit className="w-5 h-5 mr-2" />}
            {isCreateMode ? 'New Service Record' : isViewMode ? 'Service Record Details' : 'Edit Service Record'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Service Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <FileText className="w-4 h-4 mr-2" />
                    Service Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="serviceType">Service Type *</Label>
                      <Select
                        value={formData.serviceType || ''}
                        onValueChange={(value: string) => setFormData(prev => ({ ...prev, serviceType: value as ServiceType }))}
                        disabled={isViewMode}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select service type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LAWN_CARE">Lawn Care</SelectItem>
                          <SelectItem value="LAWN_MOWING">Lawn Mowing</SelectItem>
                          <SelectItem value="HEDGE_TRIMMING">Hedge Trimming</SelectItem>
                          <SelectItem value="SNOW_REMOVAL">Snow Removal</SelectItem>
                          <SelectItem value="PREMIUM_SALTING">Premium Salting</SelectItem>
                          <SelectItem value="LANDSCAPING">Landscaping</SelectItem>
                          <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                          <SelectItem value="TREE_TRIMMING">Tree Trimming</SelectItem>
                          <SelectItem value="WEEDING">Weeding</SelectItem>
                          <SelectItem value="GARDENING_PLANTING">Garden Planting</SelectItem>
                          <SelectItem value="MULCHING">Mulching</SelectItem>
                          <SelectItem value="LEAF_REMOVAL">Leaf Removal</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.serviceType && <p className="text-red-500 text-sm mt-1">{errors.serviceType}</p>}
                    </div>

                    <div>
                      <Label htmlFor="serviceDate">Service Date *</Label>
                      <Input
                        type="date"
                        value={formData.serviceDate || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, serviceDate: e.target.value }))}
                        disabled={isViewMode}
                      />
                      {errors.serviceDate && <p className="text-red-500 text-sm mt-1">{errors.serviceDate}</p>}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="serviceArea">Service Area *</Label>
                    <Input
                      placeholder="e.g., Front and back yard, Driveway and walkway"
                      value={formData.serviceArea || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, serviceArea: e.target.value }))}
                      disabled={isViewMode}
                    />
                    {errors.serviceArea && <p className="text-red-500 text-sm mt-1">{errors.serviceArea}</p>}
                  </div>

                  <div>
                    <Label htmlFor="completionStatus">Completion Status</Label>
                    <Select
                      value={formData.completionStatus || 'SCHEDULED'}
                      onValueChange={(value: string) => setFormData(prev => ({ ...prev, completionStatus: value as CompletionStatus }))}
                      disabled={isViewMode}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      placeholder="Service notes, special instructions, or observations..."
                      value={formData.notes || ''}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      rows={3}
                      disabled={isViewMode}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Billing Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Billing Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="amount">Service Amount *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.amount || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                        disabled={isViewMode}
                      />
                      {errors.amount && <p className="text-red-500 text-sm mt-1">{errors.amount}</p>}
                    </div>

                    <div>
                      <Label htmlFor="currency">Currency</Label>
                      <Select
                        value={formData.currency || 'CAD'}
                        onValueChange={(value: string) => setFormData(prev => ({ ...prev, currency: value }))}
                        disabled={isViewMode}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CAD">CAD</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="billingAmount">Billing Amount</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Same as service amount"
                        value={formData.billingAmount || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, billingAmount: parseFloat(e.target.value) || 0 }))}
                        disabled={isViewMode}
                      />
                    </div>

                    <div>
                      <Label htmlFor="billingDate">Billing Date</Label>
                      <Input
                        type="date"
                        value={formData.billingDate || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, billingDate: e.target.value }))}
                        disabled={isViewMode}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="billingStatus">Billing Status</Label>
                    <Select
                      value={formData.billingStatus || 'PENDING'}
                      onValueChange={(value: string) => setFormData(prev => ({ ...prev, billingStatus: value as BillingStatus }))}
                      disabled={isViewMode}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="BILLED">Billed</SelectItem>
                        <SelectItem value="PAID">Paid</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                        <SelectItem value="OVERDUE">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Service Line */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <MapPin className="w-4 h-4 mr-2" />
                    Service Line
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="serviceLineId">Service Line</Label>
                    <Select
                      value={formData.serviceLineId || ''}
                      onValueChange={(value: string) => setFormData(prev => ({ ...prev, serviceLineId: value }))}
                      disabled={isViewMode}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select service line" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableServiceLines.map((line) => (
                          <SelectItem key={line.id} value={line.id}>
                            <div className="flex items-center">
                              <div
                                className="w-3 h-3 rounded-full mr-2"
                                style={{ backgroundColor: line.color }}
                              />
                              {line.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {suggestedServiceLine && (
                    <div className="p-3 bg-tactical-gold-muted rounded-lg border-l-4 border-tactical-gold-500">
                      <p className="text-sm font-medium text-tactical-brown-dark">Suggested Service Line</p>
                      <div className="flex items-center mt-1">
                        <div
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: suggestedServiceLine.color }}
                        />
                        <span className="text-sm text-tactical-brown-dark">{suggestedServiceLine.name}</span>
                      </div>
                      <p className="text-xs text-tactical-gold mt-1">{suggestedServiceLine.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Status Summary */}
              {!isCreateMode && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-tactical-grey-500">Completion</span>
                      <Badge className={getStatusColor(formData.completionStatus || 'SCHEDULED')}>
                        {formData.completionStatus}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-tactical-grey-500">Billing</span>
                      <Badge className={getStatusColor(formData.billingStatus || 'PENDING')}>
                        {formData.billingStatus}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-sm text-tactical-grey-500">Amount</span>
                      <span className="font-medium">{formatCurrency(formData.amount || 0)}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Service Line Info */}
              {formData.serviceLineId && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Service Line Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const serviceLine = availableServiceLines.find(line => line.id === formData.serviceLineId)
                      if (!serviceLine) return null
                      
                      return (
                        <div className="space-y-3">
                          <div className="flex items-center">
                            <div
                              className="w-4 h-4 rounded-full mr-2"
                              style={{ backgroundColor: serviceLine.color }}
                            />
                            <span className="font-medium">{serviceLine.name}</span>
                          </div>
                          <p className="text-sm text-tactical-grey-500">{serviceLine.description}</p>
                          {serviceLine.seasonality && (
                            <Badge variant="outline" className="text-xs">
                              {serviceLine.seasonality} service
                            </Badge>
                          )}
                        </div>
                      )
                    })()}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-between pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-2" />
              {isViewMode ? 'Close' : 'Cancel'}
            </Button>
            
            {!isViewMode && (
              <Button type="submit" disabled={loading}>
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Saving...' : isCreateMode ? 'Create Service Record' : 'Save Changes'}
              </Button>
            )}
          </div>
          
          {errors.submit && (
            <p className="text-red-500 text-sm mt-2">{errors.submit}</p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default ServiceRecordModal