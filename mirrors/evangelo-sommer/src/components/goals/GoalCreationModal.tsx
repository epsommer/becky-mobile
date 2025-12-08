// src/components/goals/GoalCreationModal.tsx
// Modal for creating and editing goals with comprehensive options

"use client"

import React, { useState, useEffect } from 'react'
import { format, addDays, addWeeks, addMonths, addYears } from 'date-fns'
import { Calendar, Target, Clock, User, Tag, AlertCircle, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { 
  Goal, 
  GoalTimeframe, 
  GoalCategory, 
  Priority, 
  GoalStatus,
  GOAL_CATEGORIES,
  QUARTERS 
} from '@/types/goals'
import { cn } from '@/lib/utils'

interface GoalCreationModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => void
  editingGoal?: Goal
  initialTimeframe?: GoalTimeframe
  initialDate?: Date
}

interface FormData {
  title: string
  description: string
  category: GoalCategory
  timeframe: GoalTimeframe
  priority: Priority
  status: GoalStatus
  startDate: string
  endDate: string
  customTimeframe?: {
    name: string
    startDate: string
    endDate: string
    description?: string
  }
  progressTarget: number
  progressUnit: string
  currentValue: number
  targetValue: number
  estimatedHours: number
  tags: string[]
  notes: string
  reminderSettings: {
    enabled: boolean
    frequency: 'daily' | 'weekly' | 'monthly' | 'custom'
    time: string
    advanceNotice: number
  }
  recurring: {
    enabled: boolean
    pattern: GoalTimeframe
    interval: number
    endAfter?: number
    endDate?: string
  }
  color: string
}

const defaultFormData: FormData = {
  title: '',
  description: '',
  category: 'business',
  timeframe: 'monthly',
  priority: 'medium',
  status: 'not-started',
  startDate: format(new Date(), 'yyyy-MM-dd'),
  endDate: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
  progressTarget: 100,
  progressUnit: 'percentage',
  currentValue: 0,
  targetValue: 100,
  estimatedHours: 0,
  tags: [],
  notes: '',
  reminderSettings: {
    enabled: false,
    frequency: 'weekly',
    time: '09:00',
    advanceNotice: 3
  },
  recurring: {
    enabled: false,
    pattern: 'monthly',
    interval: 1
  },
  color: '#D4AF37'
}

const GoalCreationModal: React.FC<GoalCreationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingGoal,
  initialTimeframe,
  initialDate
}) => {
  const [formData, setFormData] = useState<FormData>(defaultFormData)
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced' | 'reminders' | 'recurring'>('basic')
  const [newTag, setNewTag] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Initialize form data
  useEffect(() => {
    if (editingGoal) {
      setFormData({
        title: editingGoal.title,
        description: editingGoal.description || '',
        category: editingGoal.category,
        timeframe: editingGoal.timeframe,
        priority: editingGoal.priority,
        status: editingGoal.status,
        startDate: format(new Date(editingGoal.startDate), 'yyyy-MM-dd'),
        endDate: format(new Date(editingGoal.endDate), 'yyyy-MM-dd'),
        customTimeframe: editingGoal.customTimeframe ? {
          name: editingGoal.customTimeframe.name,
          startDate: editingGoal.customTimeframe.startDate,
          endDate: editingGoal.customTimeframe.endDate,
          description: editingGoal.customTimeframe.description
        } : undefined,
        progressTarget: editingGoal.progressTarget,
        progressUnit: editingGoal.progressUnit,
        currentValue: editingGoal.currentValue,
        targetValue: editingGoal.targetValue,
        estimatedHours: editingGoal.estimatedHours || 0,
        tags: [...editingGoal.tags],
        notes: editingGoal.notes || '',
        reminderSettings: {
          enabled: editingGoal.reminderSettings.enabled,
          frequency: editingGoal.reminderSettings.frequency || 'weekly',
          time: editingGoal.reminderSettings.time || '09:00',
          advanceNotice: editingGoal.reminderSettings.advanceNotice || 3
        },
        recurring: {
          enabled: editingGoal.recurring?.enabled || false,
          pattern: editingGoal.recurring?.pattern || 'monthly',
          interval: editingGoal.recurring?.interval || 1,
          endAfter: editingGoal.recurring?.endAfter,
          endDate: editingGoal.recurring?.endDate
        },
        color: editingGoal.color || '#D4AF37'
      })
    } else {
      const newFormData = { ...defaultFormData }
      
      if (initialTimeframe) {
        newFormData.timeframe = initialTimeframe
      }
      
      if (initialDate) {
        newFormData.startDate = format(initialDate, 'yyyy-MM-dd')
        
        // Set end date based on timeframe
        let endDate = new Date(initialDate)
        switch (initialTimeframe || 'monthly') {
          case 'daily':
            endDate = addDays(initialDate, 1)
            break
          case 'weekly':
            endDate = addWeeks(initialDate, 1)
            break
          case 'monthly':
            endDate = addMonths(initialDate, 1)
            break
          case 'quarterly':
            endDate = addMonths(initialDate, 3)
            break
          case 'yearly':
            endDate = addYears(initialDate, 1)
            break
        }
        newFormData.endDate = format(endDate, 'yyyy-MM-dd')
      }
      
      setFormData(newFormData)
    }
  }, [editingGoal, initialTimeframe, initialDate, isOpen])

  // Update end date when timeframe changes
  useEffect(() => {
    if (formData.timeframe !== 'custom') {
      const startDate = new Date(formData.startDate)
      let endDate = new Date(startDate)
      
      switch (formData.timeframe) {
        case 'daily':
          endDate = addDays(startDate, 1)
          break
        case 'weekly':
          endDate = addWeeks(startDate, 1)
          break
        case 'monthly':
          endDate = addMonths(startDate, 1)
          break
        case 'quarterly':
          endDate = addMonths(startDate, 3)
          break
        case 'yearly':
          endDate = addYears(startDate, 1)
          break
      }
      
      setFormData(prev => ({
        ...prev,
        endDate: format(endDate, 'yyyy-MM-dd')
      }))
    }
  }, [formData.timeframe, formData.startDate])

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear error when field is updated
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  const handleNestedInputChange = (parent: keyof FormData, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...(prev[parent] as any),
        [field]: value
      }
    }))
  }

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }))
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    }
    
    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      newErrors.endDate = 'End date must be after start date'
    }
    
    if (formData.targetValue <= 0) {
      newErrors.targetValue = 'Target value must be greater than 0'
    }
    
    if (formData.timeframe === 'custom' && (!formData.customTimeframe?.name || !formData.customTimeframe?.startDate || !formData.customTimeframe?.endDate)) {
      newErrors.customTimeframe = 'Custom timeframe details are required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    const goalData: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'> = {
      title: formData.title,
      description: formData.description || undefined,
      category: formData.category,
      timeframe: formData.timeframe,
      customTimeframe: formData.timeframe === 'custom' ? {
        id: `custom-${Date.now()}`,
        name: formData.customTimeframe!.name,
        startDate: formData.customTimeframe!.startDate,
        endDate: formData.customTimeframe!.endDate,
        description: formData.customTimeframe!.description
      } : undefined,
      priority: formData.priority,
      status: formData.status,
      progress: editingGoal?.progress || 0,
      progressTarget: formData.progressTarget,
      progressUnit: formData.progressUnit,
      currentValue: formData.currentValue,
      targetValue: formData.targetValue,
      startDate: formData.startDate,
      endDate: formData.endDate,
      parentGoalId: undefined,
      childGoalIds: editingGoal?.childGoalIds || [],
      milestoneIds: editingGoal?.milestoneIds || [],
      dependencies: editingGoal?.dependencies || [],
      clientId: editingGoal?.clientId,
      projectId: editingGoal?.projectId,
      conversationId: editingGoal?.conversationId,
      calendarEventIds: editingGoal?.calendarEventIds || [],
      reminderIds: editingGoal?.reminderIds || [],
      progressHistory: editingGoal?.progressHistory || [],
      lastProgressUpdate: editingGoal?.lastProgressUpdate,
      progressUpdateFrequency: editingGoal?.progressUpdateFrequency,
      reminderSettings: formData.reminderSettings,
      color: formData.color,
      tags: formData.tags,
      notes: formData.notes || undefined,
      attachments: editingGoal?.attachments || [],
      estimatedHours: formData.estimatedHours > 0 ? formData.estimatedHours : undefined,
      actualHours: editingGoal?.actualHours,
      difficultyRating: editingGoal?.difficultyRating,
      successMetrics: editingGoal?.successMetrics,
      recurring: formData.recurring.enabled ? {
        enabled: true,
        pattern: formData.recurring.pattern,
        interval: formData.recurring.interval,
        endAfter: formData.recurring.endAfter,
        endDate: formData.recurring.endDate
      } : undefined
    }
    
    onSave(goalData)
  }

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: Target },
    { id: 'advanced', label: 'Advanced', icon: Clock },
    { id: 'reminders', label: 'Reminders', icon: AlertCircle },
    { id: 'recurring', label: 'Recurring', icon: Calendar }
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-gold" />
            {editingGoal ? 'Edit Goal' : 'Create New Goal'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-light-background rounded-lg p-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  activeTab === tab.id
                    ? "bg-white text-gold shadow-sm"
                    : "text-medium-grey hover:text-hud-text-primary"
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'basic' && (
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-hud-text-primary mb-1">
                    Goal Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className={cn(
                      "w-full px-3 py-2 border border-hud-border rounded-md focus:ring-2 focus:ring-gold focus:border-transparent",
                      errors.title && "border-red-500"
                    )}
                    placeholder="Enter goal title"
                  />
                  {errors.title && (
                    <p className="text-red-500 text-sm mt-1">{errors.title}</p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-hud-text-primary mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className="w-full px-3 py-2 border border-hud-border rounded-md focus:ring-2 focus:ring-gold focus:border-transparent"
                    rows={3}
                    placeholder="Describe your goal"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-hud-text-primary mb-1">
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => handleInputChange('category', e.target.value as GoalCategory)}
                      className="w-full px-3 py-2 border border-hud-border rounded-md focus:ring-2 focus:ring-gold focus:border-transparent"
                    >
                      {GOAL_CATEGORIES.map(category => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="block text-sm font-medium text-hud-text-primary mb-1">
                      Priority
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => handleInputChange('priority', e.target.value as Priority)}
                      className="w-full px-3 py-2 border border-hud-border rounded-md focus:ring-2 focus:ring-gold focus:border-transparent"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Timeframe */}
                  <div>
                    <label className="block text-sm font-medium text-hud-text-primary mb-1">
                      Timeframe
                    </label>
                    <select
                      value={formData.timeframe}
                      onChange={(e) => handleInputChange('timeframe', e.target.value as GoalTimeframe)}
                      className="w-full px-3 py-2 border border-hud-border rounded-md focus:ring-2 focus:ring-gold focus:border-transparent"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-hud-text-primary mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => handleInputChange('status', e.target.value as GoalStatus)}
                      className="w-full px-3 py-2 border border-hud-border rounded-md focus:ring-2 focus:ring-gold focus:border-transparent"
                    >
                      <option value="not-started">Not Started</option>
                      <option value="in-progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="paused">Paused</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                {/* Custom Timeframe */}
                {formData.timeframe === 'custom' && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Custom Timeframe</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-hud-text-primary mb-1">
                          Timeframe Name *
                        </label>
                        <input
                          type="text"
                          value={formData.customTimeframe?.name || ''}
                          onChange={(e) => handleNestedInputChange('customTimeframe', 'name', e.target.value)}
                          className="w-full px-3 py-2 border border-hud-border rounded-md focus:ring-2 focus:ring-gold focus:border-transparent"
                          placeholder="e.g., Sprint 1, Project Phase A"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-hud-text-primary mb-1">
                            Custom Start Date *
                          </label>
                          <input
                            type="date"
                            value={formData.customTimeframe?.startDate || formData.startDate}
                            onChange={(e) => handleNestedInputChange('customTimeframe', 'startDate', e.target.value)}
                            className="w-full px-3 py-2 border border-hud-border rounded-md focus:ring-2 focus:ring-gold focus:border-transparent"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-hud-text-primary mb-1">
                            Custom End Date *
                          </label>
                          <input
                            type="date"
                            value={formData.customTimeframe?.endDate || formData.endDate}
                            onChange={(e) => handleNestedInputChange('customTimeframe', 'endDate', e.target.value)}
                            className="w-full px-3 py-2 border border-hud-border rounded-md focus:ring-2 focus:ring-gold focus:border-transparent"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {/* Start Date */}
                  <div>
                    <label className="block text-sm font-medium text-hud-text-primary mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => handleInputChange('startDate', e.target.value)}
                      className="w-full px-3 py-2 border border-hud-border rounded-md focus:ring-2 focus:ring-gold focus:border-transparent"
                    />
                  </div>

                  {/* End Date */}
                  <div>
                    <label className="block text-sm font-medium text-hud-text-primary mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => handleInputChange('endDate', e.target.value)}
                      className={cn(
                        "w-full px-3 py-2 border border-hud-border rounded-md focus:ring-2 focus:ring-gold focus:border-transparent",
                        errors.endDate && "border-red-500"
                      )}
                      disabled={formData.timeframe !== 'custom'}
                    />
                    {errors.endDate && (
                      <p className="text-red-500 text-sm mt-1">{errors.endDate}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'advanced' && (
            <Card>
              <CardHeader>
                <CardTitle>Advanced Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Progress Unit */}
                  <div>
                    <label className="block text-sm font-medium text-hud-text-primary mb-1">
                      Progress Unit
                    </label>
                    <input
                      type="text"
                      value={formData.progressUnit}
                      onChange={(e) => handleInputChange('progressUnit', e.target.value)}
                      className="w-full px-3 py-2 border border-hud-border rounded-md focus:ring-2 focus:ring-gold focus:border-transparent"
                      placeholder="e.g., percentage, tasks, hours"
                    />
                  </div>

                  {/* Target Value */}
                  <div>
                    <label className="block text-sm font-medium text-hud-text-primary mb-1">
                      Target Value *
                    </label>
                    <input
                      type="number"
                      value={formData.targetValue}
                      onChange={(e) => handleInputChange('targetValue', parseInt(e.target.value) || 0)}
                      className={cn(
                        "w-full px-3 py-2 border border-hud-border rounded-md focus:ring-2 focus:ring-gold focus:border-transparent",
                        errors.targetValue && "border-red-500"
                      )}
                      min="1"
                    />
                    {errors.targetValue && (
                      <p className="text-red-500 text-sm mt-1">{errors.targetValue}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Current Value */}
                  <div>
                    <label className="block text-sm font-medium text-hud-text-primary mb-1">
                      Current Value
                    </label>
                    <input
                      type="number"
                      value={formData.currentValue}
                      onChange={(e) => handleInputChange('currentValue', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-hud-border rounded-md focus:ring-2 focus:ring-gold focus:border-transparent"
                      min="0"
                      max={formData.targetValue}
                    />
                  </div>

                  {/* Estimated Hours */}
                  <div>
                    <label className="block text-sm font-medium text-hud-text-primary mb-1">
                      Estimated Hours
                    </label>
                    <input
                      type="number"
                      value={formData.estimatedHours}
                      onChange={(e) => handleInputChange('estimatedHours', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-hud-border rounded-md focus:ring-2 focus:ring-gold focus:border-transparent"
                      min="0"
                      step="0.5"
                    />
                  </div>
                </div>

                {/* Color */}
                <div>
                  <label className="block text-sm font-medium text-hud-text-primary mb-1">
                    Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => handleInputChange('color', e.target.value)}
                      className="w-12 h-10 border border-hud-border rounded-md"
                    />
                    <input
                      type="text"
                      value={formData.color}
                      onChange={(e) => handleInputChange('color', e.target.value)}
                      className="flex-1 px-3 py-2 border border-hud-border rounded-md focus:ring-2 focus:ring-gold focus:border-transparent"
                      placeholder="#D4AF37"
                    />
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-hud-text-primary mb-1">
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="text-medium-grey hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      className="flex-1 px-3 py-2 border border-hud-border rounded-md focus:ring-2 focus:ring-gold focus:border-transparent"
                      placeholder="Add tag..."
                    />
                    <Button type="button" onClick={addTag} variant="outline">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-hud-text-primary mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    className="w-full px-3 py-2 border border-hud-border rounded-md focus:ring-2 focus:ring-gold focus:border-transparent"
                    rows={4}
                    placeholder="Additional notes or context..."
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'reminders' && (
            <Card>
              <CardHeader>
                <CardTitle>Reminder Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.reminderSettings.enabled}
                    onChange={(e) => handleNestedInputChange('reminderSettings', 'enabled', e.target.checked)}
                    className="rounded border-hud-border text-gold focus:ring-gold"
                  />
                  <label className="text-sm font-medium text-hud-text-primary">
                    Enable reminders for this goal
                  </label>
                </div>

                {formData.reminderSettings.enabled && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-hud-text-primary mb-1">
                          Reminder Frequency
                        </label>
                        <select
                          value={formData.reminderSettings.frequency}
                          onChange={(e) => handleNestedInputChange('reminderSettings', 'frequency', e.target.value)}
                          className="w-full px-3 py-2 border border-hud-border rounded-md focus:ring-2 focus:ring-gold focus:border-transparent"
                        >
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-hud-text-primary mb-1">
                          Reminder Time
                        </label>
                        <input
                          type="time"
                          value={formData.reminderSettings.time}
                          onChange={(e) => handleNestedInputChange('reminderSettings', 'time', e.target.value)}
                          className="w-full px-3 py-2 border border-hud-border rounded-md focus:ring-2 focus:ring-gold focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-hud-text-primary mb-1">
                        Deadline Warning (days in advance)
                      </label>
                      <input
                        type="number"
                        value={formData.reminderSettings.advanceNotice}
                        onChange={(e) => handleNestedInputChange('reminderSettings', 'advanceNotice', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-hud-border rounded-md focus:ring-2 focus:ring-gold focus:border-transparent"
                        min="0"
                        max="30"
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'recurring' && (
            <Card>
              <CardHeader>
                <CardTitle>Recurring Goal Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.recurring.enabled}
                    onChange={(e) => handleNestedInputChange('recurring', 'enabled', e.target.checked)}
                    className="rounded border-hud-border text-gold focus:ring-gold"
                  />
                  <label className="text-sm font-medium text-hud-text-primary">
                    Make this a recurring goal
                  </label>
                </div>

                {formData.recurring.enabled && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-hud-text-primary mb-1">
                          Recurrence Pattern
                        </label>
                        <select
                          value={formData.recurring.pattern}
                          onChange={(e) => handleNestedInputChange('recurring', 'pattern', e.target.value)}
                          className="w-full px-3 py-2 border border-hud-border rounded-md focus:ring-2 focus:ring-gold focus:border-transparent"
                        >
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                          <option value="quarterly">Quarterly</option>
                          <option value="yearly">Yearly</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-hud-text-primary mb-1">
                          Interval (every X periods)
                        </label>
                        <input
                          type="number"
                          value={formData.recurring.interval}
                          onChange={(e) => handleNestedInputChange('recurring', 'interval', parseInt(e.target.value) || 1)}
                          className="w-full px-3 py-2 border border-hud-border rounded-md focus:ring-2 focus:ring-gold focus:border-transparent"
                          min="1"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-hud-text-primary mb-1">
                          End After (occurrences)
                        </label>
                        <input
                          type="number"
                          value={formData.recurring.endAfter || ''}
                          onChange={(e) => handleNestedInputChange('recurring', 'endAfter', e.target.value ? parseInt(e.target.value) : undefined)}
                          className="w-full px-3 py-2 border border-hud-border rounded-md focus:ring-2 focus:ring-gold focus:border-transparent"
                          min="1"
                          placeholder="Leave empty for no limit"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-hud-text-primary mb-1">
                          End Date
                        </label>
                        <input
                          type="date"
                          value={formData.recurring.endDate || ''}
                          onChange={(e) => handleNestedInputChange('recurring', 'endDate', e.target.value || undefined)}
                          className="w-full px-3 py-2 border border-hud-border rounded-md focus:ring-2 focus:ring-gold focus:border-transparent"
                        />
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t border-hud-border">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-tactical-gold hover:bg-tactical-gold/90 text-white"
            >
              {editingGoal ? 'Update Goal' : 'Create Goal'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default GoalCreationModal