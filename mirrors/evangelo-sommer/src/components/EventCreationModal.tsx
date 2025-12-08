"use client"

import React, { useState, useEffect } from 'react'
import { format, parseISO, addMinutes } from 'date-fns'
import { Calendar, Clock, MapPin, User, Target, CheckCircle, AlertTriangle, Bell, Plus, X, Repeat } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import ClientSelector, { Client } from '@/components/ClientSelector'

// Types for the unified event system
export type EventType = 'event' | 'task' | 'goal' | 'milestone'
export type Priority = 'low' | 'medium' | 'high' | 'urgent'
export type GoalTimeframe = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom'

// Notification types
export type NotificationTrigger = 'minutes' | 'hours' | 'days' | 'weeks'

// Recurring event types
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
export type RecurrenceInterval = 'days' | 'weeks' | 'months' | 'years'

export interface RecurrenceRule {
  frequency: RecurrenceFrequency
  interval: number // e.g., every 2 weeks = interval: 2, intervalType: 'weeks'
  intervalType?: RecurrenceInterval
  endDate?: string
  occurrences?: number
  weekDays?: number[] // 0 = Sunday, 1 = Monday, etc. (for weekly recurrence)
  monthDay?: number // Day of month (1-31) for monthly recurrence
}

export interface NotificationRule {
  id: string
  value: number
  trigger: NotificationTrigger
  enabled: boolean
}

// Preset notification options (like Google Calendar and Notion)
export const PRESET_NOTIFICATIONS = [
  { label: 'At time of event', value: 0, trigger: 'minutes' as NotificationTrigger },
  { label: '5 minutes before', value: 5, trigger: 'minutes' as NotificationTrigger },
  { label: '10 minutes before', value: 10, trigger: 'minutes' as NotificationTrigger },
  { label: '15 minutes before', value: 15, trigger: 'minutes' as NotificationTrigger },
  { label: '30 minutes before', value: 30, trigger: 'minutes' as NotificationTrigger },
  { label: '1 hour before', value: 1, trigger: 'hours' as NotificationTrigger },
  { label: '2 hours before', value: 2, trigger: 'hours' as NotificationTrigger },
  { label: '1 day before', value: 1, trigger: 'days' as NotificationTrigger },
  { label: '2 days before', value: 2, trigger: 'days' as NotificationTrigger },
  { label: '1 week before', value: 1, trigger: 'weeks' as NotificationTrigger },
]

export interface UnifiedEvent {
  id: string
  type: EventType
  title: string
  description?: string
  startDateTime: string
  endDateTime?: string
  duration: number // minutes
  priority: Priority
  clientId?: string
  clientName?: string
  location?: string
  notes?: string
  
  // Multi-day and all-day event support
  isAllDay?: boolean
  isMultiDay?: boolean
  
  // Notification settings
  notifications?: NotificationRule[]
  
  // Recurring event settings
  recurrence?: RecurrenceRule
  isRecurring?: boolean
  parentEventId?: string // For recurring instances, references the original event
  
  // Legacy compatibility fields
  status?: string
  service?: string
  scheduledDate?: string
  
  // Goal-specific fields
  goalTimeframe?: GoalTimeframe
  progressTarget?: number
  currentProgress?: number
  
  // Milestone-specific fields
  deadline?: string
  dependencies?: string[]
  
  // Metadata
  createdAt: string
  updatedAt: string
}

interface EventCreationModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (event: UnifiedEvent) => void
  initialDate?: Date
  initialTime?: string
  editingEvent?: UnifiedEvent
  initialClientId?: string
  initialClientName?: string
}

interface FormData {
  type: EventType
  title: string
  description: string
  date: string
  startTime: string
  endTime: string
  duration: number
  priority: Priority
  clientId: string
  clientName: string
  location: string
  notes: string
  goalTimeframe: GoalTimeframe
  progressTarget: number
  deadline: string
  notifications: NotificationRule[]
  isAllDay: boolean
  isMultiDay: boolean
  endDate: string
  isRecurring: boolean
  recurrenceFrequency: RecurrenceFrequency
  recurrenceInterval: number
  recurrenceIntervalType: RecurrenceInterval
  recurrenceEndDate: string
  recurrenceOccurrences: number
  participants: string[]
}

interface FormErrors {
  title?: string
  date?: string
  startTime?: string
  duration?: string
  clientName?: string
  general?: string
}

const PRIORITY_OPTIONS: { value: Priority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'bg-light-grey text-hud-text-primary' },
  { value: 'medium', label: 'Medium', color: 'bg-tactical-gold text-hud-text-primary' },
  { value: 'high', label: 'High', color: 'bg-dark-grey text-white' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-600 text-white' }
]

const EVENT_TYPE_OPTIONS: { value: EventType; label: string; icon: React.ReactNode; defaultDuration: number }[] = [
  { value: 'event', label: 'Event/Appointment', icon: <Calendar className="w-4 h-4" />, defaultDuration: 60 },
  { value: 'task', label: 'Task', icon: <CheckCircle className="w-4 h-4" />, defaultDuration: 30 },
  { value: 'goal', label: 'Goal', icon: <Target className="w-4 h-4" />, defaultDuration: 0 },
  { value: 'milestone', label: 'Milestone', icon: <AlertTriangle className="w-4 h-4" />, defaultDuration: 0 }
]

const GOAL_TIMEFRAME_OPTIONS: { value: GoalTimeframe; label: string }[] = [
  { value: 'daily', label: 'Daily Goal' },
  { value: 'weekly', label: 'Weekly Goal' },
  { value: 'monthly', label: 'Monthly Goal' },
  { value: 'quarterly', label: 'Quarterly Goal' },
  { value: 'yearly', label: 'Yearly Goal' },
  { value: 'custom', label: 'Custom Timeframe' }
]

// Time generation utilities
const generateTimeOptions = () => {
  const times = []
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const time24 = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
      const period = hour < 12 ? 'AM' : 'PM'
      const time12Format = `${hour12}:${minute.toString().padStart(2, '0')} ${period}`
      times.push({ value: time24, label: time12Format })
    }
  }
  return times
}

const TIME_OPTIONS = generateTimeOptions()

const EventCreationModal: React.FC<EventCreationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialDate,
  initialTime,
  editingEvent,
  initialClientId,
  initialClientName
}) => {
  const [formData, setFormData] = useState<FormData>({
    type: 'event',
    title: '',
    description: '',
    date: initialDate ? format(initialDate, 'yyyy-MM-dd') : format((() => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), now.getDate()) })(), 'yyyy-MM-dd'),
    startTime: initialTime || '09:00',
    endTime: '10:00',
    duration: 60,
    priority: 'medium',
    clientId: '',
    clientName: '',
    location: '',
    notes: '',
    goalTimeframe: 'monthly',
    progressTarget: 100,
    deadline: '',
    notifications: [{ id: '1', value: 15, trigger: 'minutes', enabled: true }], // Default: 15 minutes before
    isAllDay: false,
    isMultiDay: false,
    endDate: initialDate ? format(initialDate, 'yyyy-MM-dd') : format((() => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), now.getDate()) })(), 'yyyy-MM-dd'),
    isRecurring: false,
    recurrenceFrequency: 'weekly',
    recurrenceInterval: 1,
    recurrenceIntervalType: 'weeks',
    recurrenceEndDate: format(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'), // 1 year from now
    recurrenceOccurrences: 10,
    participants: []
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([])

  // Load clients from localStorage
  useEffect(() => {
    try {
      const storedClients = JSON.parse(localStorage.getItem('clients') || '[]')
      setClients(storedClients.map((client: any) => ({ 
        id: client.id, 
        name: client.name || 'Unnamed Client' 
      })))
    } catch (error) {
      console.error('Error loading clients:', error)
    }
  }, [])

  // Update form data when initialTime, initialDate, or initialClient changes for new events
  useEffect(() => {
    if (!editingEvent && (initialTime || initialDate || initialClientId)) {
      setFormData(prev => ({
        ...prev,
        date: initialDate ? format(initialDate, 'yyyy-MM-dd') : prev.date,
        startTime: initialTime || prev.startTime,
        endDate: initialDate ? format(initialDate, 'yyyy-MM-dd') : prev.endDate,
        clientId: initialClientId || prev.clientId,
        clientName: initialClientName || prev.clientName,
      }))
    }
  }, [initialTime, initialDate, initialClientId, initialClientName, editingEvent])

  // Initialize form when editing
  useEffect(() => {
    if (editingEvent) {
      const startDate = parseISO(editingEvent.startDateTime)
      const endDate = editingEvent.endDateTime ? parseISO(editingEvent.endDateTime) : null
      
      setFormData({
        type: editingEvent.type,
        title: editingEvent.title,
        description: editingEvent.description || '',
        date: format(startDate, 'yyyy-MM-dd'),
        startTime: format(startDate, 'HH:mm'),
        endTime: endDate ? format(endDate, 'HH:mm') : format(addMinutes(startDate, editingEvent.duration), 'HH:mm'),
        duration: editingEvent.duration,
        priority: editingEvent.priority,
        clientId: editingEvent.clientId || '',
        clientName: editingEvent.clientName || '',
        location: editingEvent.location || '',
        notes: editingEvent.notes || '',
        goalTimeframe: editingEvent.goalTimeframe || 'monthly',
        progressTarget: editingEvent.progressTarget || 100,
        deadline: editingEvent.deadline || '',
        notifications: editingEvent.notifications || [{ id: '1', value: 15, trigger: 'minutes', enabled: true }],
        isAllDay: editingEvent.isAllDay || false,
        isMultiDay: editingEvent.isMultiDay || false,
        endDate: endDate ? format(endDate, 'yyyy-MM-dd') : format(startDate, 'yyyy-MM-dd'),
        isRecurring: editingEvent.isRecurring || false,
        recurrenceFrequency: editingEvent.recurrence?.frequency || 'weekly',
        recurrenceInterval: editingEvent.recurrence?.interval || 1,
        recurrenceIntervalType: editingEvent.recurrence?.intervalType || 'weeks',
        recurrenceEndDate: editingEvent.recurrence?.endDate || format(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        recurrenceOccurrences: editingEvent.recurrence?.occurrences || 10,
        participants: (editingEvent as any).metadata?.participantEmails || []
      })
    }
  }, [editingEvent])

  // Update end time and duration when type or start time changes
  useEffect(() => {
    const selectedEventType = EVENT_TYPE_OPTIONS.find(option => option.value === formData.type)
    if (selectedEventType && !editingEvent) {
      const defaultDuration = selectedEventType.defaultDuration
      setFormData(prev => ({
        ...prev,
        duration: defaultDuration,
        endTime: defaultDuration > 0 ? format(addMinutes(new Date(`${prev.date}T${prev.startTime}`), defaultDuration), 'HH:mm') : prev.endTime
      }))
    }
  }, [formData.type, formData.startTime, editingEvent])

  const handleInputChange = (field: keyof FormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear specific field errors
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleTimeChange = (field: 'startTime' | 'endTime', value: string) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value }
      
      // Calculate duration if both times are set
      if (field === 'startTime' || field === 'endTime') {
        const startDateTime = new Date(`${prev.date}T${field === 'startTime' ? value : prev.startTime}`)
        const endDateTime = new Date(`${prev.date}T${field === 'endTime' ? value : prev.endTime}`)
        
        if (endDateTime > startDateTime) {
          newData.duration = Math.round((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60))
        }
      }
      
      return newData
    })

    if ((errors as any)[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleDurationChange = (minutes: number) => {
    setFormData(prev => {
      const startDateTime = new Date(`${prev.date}T${prev.startTime}`)
      const endDateTime = addMinutes(startDateTime, minutes)
      
      return {
        ...prev,
        duration: minutes,
        endTime: format(endDateTime, 'HH:mm')
      }
    })
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    }
    
    if (!formData.date) {
      newErrors.date = 'Date is required'
    }
    
    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required'
    }
    
    if (!formData.clientName.trim()) {
      newErrors.clientName = 'Client is required'
    }
    
    if (formData.type !== 'goal' && formData.type !== 'milestone' && formData.duration <= 0) {
      newErrors.duration = 'Duration must be greater than 0'
    }
    
    // Create dates in local timezone to avoid timezone mismatches
    const startDateTime = new Date(`${formData.date}T${formData.startTime}`)
    if (formData.endTime) {
      const endDateTime = new Date(`${formData.date}T${formData.endTime}`)
      if (endDateTime <= startDateTime) {
        newErrors.general = 'End time must be after start time'
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setIsLoading(true)
    
    try {
      // Create dates in local timezone to ensure correct day display
      const startDateTime = formData.isAllDay 
        ? new Date(`${formData.date}T00:00:00`) 
        : new Date(`${formData.date}T${formData.startTime}`)
        
      let endDateTime: Date
      
      if (formData.isAllDay) {
        // For all-day events, end at 23:59 on the same or end date
        const endDateStr = formData.isMultiDay ? formData.endDate : formData.date
        endDateTime = new Date(`${endDateStr}T23:59:59`)
      } else if (formData.isMultiDay) {
        // For multi-day events with specific times
        endDateTime = new Date(`${formData.endDate}T${formData.endTime}`)
      } else {
        // Regular single-day events
        endDateTime = formData.endTime ? new Date(`${formData.date}T${formData.endTime}`) : addMinutes(startDateTime, formData.duration)
      }
      
      const newEvent: UnifiedEvent = {
        id: editingEvent?.id || `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: formData.type,
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        startDateTime: `${formData.date}T${formData.startTime}:00`,
        endDateTime: formData.type === 'goal' ? undefined : (formData.isMultiDay ? `${formData.endDate}T${formData.endTime}:00` : `${formData.date}T${formData.endTime}:00`),
        duration: formData.duration,
        priority: formData.priority,
        clientId: formData.clientId || undefined,
        clientName: formData.clientName || undefined,
        location: formData.location.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        goalTimeframe: formData.type === 'goal' ? formData.goalTimeframe : undefined,
        progressTarget: formData.type === 'goal' ? formData.progressTarget : undefined,
        currentProgress: formData.type === 'goal' ? 0 : undefined,
        deadline: formData.type === 'milestone' && formData.deadline ? formData.deadline : undefined,
        notifications: formData.notifications.length > 0 ? formData.notifications : undefined,
        isAllDay: formData.isAllDay,
        isMultiDay: formData.isMultiDay,
        isRecurring: formData.isRecurring,
        recurrence: formData.isRecurring ? {
          frequency: formData.recurrenceFrequency,
          interval: formData.recurrenceInterval,
          intervalType: formData.recurrenceFrequency === 'custom' ? formData.recurrenceIntervalType : undefined,
          endDate: formData.recurrenceEndDate,
          occurrences: formData.recurrenceOccurrences
        } : undefined,
        createdAt: editingEvent?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      // Add participants for API integration
      const eventWithParticipants = {
        ...newEvent,
        participants: formData.participants.filter(email => email.trim() !== '')
      }
      
      await onSave(eventWithParticipants as UnifiedEvent)
      onClose()
      
      // Reset form for next use
      if (!editingEvent) {
        setFormData({
          type: 'event',
          title: '',
          description: '',
          date: format((() => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), now.getDate()) })(), 'yyyy-MM-dd'),
          startTime: '09:00',
          endTime: '10:00',
          duration: 60,
          priority: 'medium',
          clientId: '',
          clientName: '',
          location: '',
          notes: '',
          goalTimeframe: 'monthly',
          progressTarget: 100,
          deadline: '',
          notifications: [{ id: '1', value: 15, trigger: 'minutes', enabled: true }],
          isAllDay: false,
          isMultiDay: false,
          endDate: format(new Date(), 'yyyy-MM-dd'),
          isRecurring: false,
          recurrenceFrequency: 'weekly',
          recurrenceInterval: 1,
          recurrenceIntervalType: 'weeks',
          recurrenceEndDate: format(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
          recurrenceOccurrences: 10,
          participants: []
        })
      }
      
    } catch (error) {
      console.error('Error saving event:', error)
      setErrors({ general: 'Failed to save event. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSubmit(e as any)
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white border-hud-border"
        onKeyDown={handleKeyDown}
      >
        <DialogHeader className="border-b border-hud-border pb-4">
          <DialogTitle className="text-xl font-primary font-semibold uppercase tracking-wide text-hud-text-primary">
            {editingEvent ? 'Edit Event' : 'Create New Event'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Event Type Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-hud-text-primary font-primary uppercase tracking-wide">
              Event Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              {EVENT_TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleInputChange('type', option.value)}
                  className={`flex items-center gap-3 p-3 border-2 transition-colors font-primary ${
                    formData.type === option.value
                      ? 'border-hud-border-accent bg-tactical-gold-light text-hud-text-primary'
                      : 'border-hud-border bg-white text-medium-grey hover:border-hud-border-accent'
                  }`}
                >
                  {option.icon}
                  <span className="font-medium uppercase text-xs tracking-wide">
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <label htmlFor="title" className="block text-sm font-semibold text-hud-text-primary font-primary uppercase tracking-wide">
              Title *
            </label>
            <input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className={`w-full p-3 border-2 font-primary ${
                errors.title ? 'border-red-500' : 'border-hud-border focus:border-hud-border-accent'
              } bg-white`}
              placeholder="Enter event title"
            />
            {errors.title && (
              <p className="text-sm text-red-600 font-primary">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label htmlFor="description" className="block text-sm font-semibold text-hud-text-primary font-primary uppercase tracking-wide">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full p-3 border-2 border-hud-border focus:border-hud-border-accent bg-white font-primary"
              placeholder="Enter event description"
            />
          </div>

          {/* Date and Time Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Date */}
            <div className="space-y-2">
              <label htmlFor="date" className="block text-sm font-semibold text-hud-text-primary font-primary uppercase tracking-wide">
                Date *
              </label>
              <input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                className={`w-full p-3 border-2 font-primary ${
                  errors.date ? 'border-red-500' : 'border-hud-border focus:border-hud-border-accent'
                } bg-white`}
              />
              {errors.date && (
                <p className="text-sm text-red-600 font-primary">{errors.date}</p>
              )}
            </div>

            {/* Start Time */}
            <div className="space-y-2">
              <label htmlFor="startTime" className="block text-sm font-semibold text-hud-text-primary font-primary uppercase tracking-wide">
                {formData.type === 'goal' ? 'Target Date' : 'Start Time'} *
              </label>
              <select
                id="startTime"
                value={formData.startTime}
                onChange={(e) => handleTimeChange('startTime', e.target.value)}
                className={`w-full p-3 border-2 font-primary ${
                  errors.startTime ? 'border-red-500' : 'border-hud-border focus:border-hud-border-accent'
                } bg-white`}
              >
                {TIME_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.startTime && (
                <p className="text-sm text-red-600 font-primary">{errors.startTime}</p>
              )}
            </div>

            {/* End Time / Duration */}
            {formData.type !== 'goal' && formData.type !== 'milestone' && (
              <div className="space-y-2">
                <label htmlFor="endTime" className="block text-sm font-semibold text-hud-text-primary font-primary uppercase tracking-wide">
                  End Time
                </label>
                <select
                  id="endTime"
                  value={formData.endTime}
                  onChange={(e) => handleTimeChange('endTime', e.target.value)}
                  className="w-full p-3 border-2 border-hud-border focus:border-hud-border-accent bg-white font-primary"
                >
                  {TIME_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Duration Display */}
          {formData.type !== 'goal' && formData.type !== 'milestone' && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-medium-grey font-primary">
                <Clock className="w-4 h-4" />
                <span>Duration: {formData.duration} minutes ({Math.floor(formData.duration / 60)}h {formData.duration % 60}m)</span>
              </div>
              <div className="flex gap-2">
                {[30, 60, 90, 120].map(minutes => (
                  <button
                    key={minutes}
                    type="button"
                    onClick={() => handleDurationChange(minutes)}
                    className="px-3 py-1 text-xs border border-hud-border hover:border-hud-border-accent text-medium-grey hover:text-hud-text-primary font-primary"
                  >
                    {minutes}m
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* All-day and Multi-day Event Options */}
          {formData.type !== 'goal' && formData.type !== 'milestone' && (
            <div className="space-y-4 p-4 border border-hud-border bg-hud-background-secondary">
              <h4 className="text-sm font-semibold text-hud-text-primary font-primary uppercase tracking-wide">
                Event Duration Options
              </h4>
              
              <div className="space-y-3">
                {/* All-day Event */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isAllDay}
                    onChange={(e) => {
                      setFormData(prev => ({
                        ...prev,
                        isAllDay: e.target.checked,
                        startTime: e.target.checked ? '00:00' : prev.startTime,
                        endTime: e.target.checked ? '23:59' : prev.endTime
                      }))
                    }}
                    className="w-4 h-4 border-2 border-hud-border"
                  />
                  <div>
                    <span className="text-sm font-medium text-hud-text-primary font-primary">All-day event</span>
                    <p className="text-xs text-medium-grey font-primary">Event lasts the entire day without specific times</p>
                  </div>
                </label>

                {/* Multi-day Event */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isMultiDay}
                    onChange={(e) => {
                      setFormData(prev => ({
                        ...prev,
                        isMultiDay: e.target.checked
                      }))
                    }}
                    className="w-4 h-4 border-2 border-hud-border"
                  />
                  <div>
                    <span className="text-sm font-medium text-hud-text-primary font-primary">Multi-day event</span>
                    <p className="text-xs text-medium-grey font-primary">Event spans across multiple days</p>
                  </div>
                </label>

                {/* End Date (Multi-day events only) */}
                {formData.isMultiDay && (
                  <div className="ml-7 space-y-2">
                    <label htmlFor="endDate" className="block text-sm font-semibold text-hud-text-primary font-primary uppercase tracking-wide">
                      End Date
                    </label>
                    <input
                      type="date"
                      id="endDate"
                      value={formData.endDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                      min={formData.date}
                      className="w-full p-3 border-2 border-hud-border focus:border-hud-border-accent bg-white font-primary"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recurring Event Options */}
          {formData.type !== 'goal' && formData.type !== 'milestone' && (
            <div className="space-y-4 p-4 border border-hud-border bg-hud-background-secondary">
              <h4 className="text-sm font-semibold text-hud-text-primary font-primary uppercase tracking-wide">
                <Repeat className="inline w-4 h-4 mr-2" />
                Recurring Event
              </h4>
              
              <div className="space-y-4">
                {/* Enable Recurring */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isRecurring}
                    onChange={(e) => {
                      setFormData(prev => ({
                        ...prev,
                        isRecurring: e.target.checked
                      }))
                    }}
                    className="w-4 h-4 border-2 border-hud-border"
                  />
                  <div>
                    <span className="text-sm font-medium text-hud-text-primary font-primary">Make this a recurring event</span>
                    <p className="text-xs text-medium-grey font-primary">Event will repeat based on the schedule below</p>
                  </div>
                </label>

                {/* Recurring Options */}
                {formData.isRecurring && (
                  <div className="ml-7 space-y-4">
                    {/* Frequency Selection */}
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-hud-text-primary font-primary uppercase tracking-wide">
                        Repeats
                      </label>
                      <select
                        value={formData.recurrenceFrequency}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          recurrenceFrequency: e.target.value as RecurrenceFrequency,
                          recurrenceInterval: e.target.value === 'daily' ? 1 : 
                                             e.target.value === 'weekly' ? 1 :
                                             e.target.value === 'monthly' ? 1 :
                                             e.target.value === 'yearly' ? 1 : prev.recurrenceInterval
                        }))}
                        className="w-full p-3 border-2 border-hud-border focus:border-hud-border-accent bg-white font-primary"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>

                    {/* Custom Interval */}
                    {formData.recurrenceFrequency === 'custom' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-hud-text-primary font-primary mb-1">
                            Every
                          </label>
                          <input
                            type="number"
                            value={formData.recurrenceInterval}
                            onChange={(e) => setFormData(prev => ({ ...prev, recurrenceInterval: parseInt(e.target.value) || 1 }))}
                            min="1"
                            max="365"
                            className="w-full p-3 border-2 border-hud-border focus:border-hud-border-accent bg-white font-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-hud-text-primary font-primary mb-1">
                            Period
                          </label>
                          <select
                            value={formData.recurrenceIntervalType}
                            onChange={(e) => setFormData(prev => ({ ...prev, recurrenceIntervalType: e.target.value as RecurrenceInterval }))}
                            className="w-full p-3 border-2 border-hud-border focus:border-hud-border-accent bg-white font-primary"
                          >
                            <option value="days">Days</option>
                            <option value="weeks">Weeks</option>
                            <option value="months">Months</option>
                            <option value="years">Years</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Quick Preset Buttons */}
                    {formData.recurrenceFrequency !== 'custom' && (
                      <div className="space-y-2">
                        <span className="text-xs text-medium-grey font-primary uppercase tracking-wide">Quick presets:</span>
                        <div className="flex flex-wrap gap-2">
                          {formData.recurrenceFrequency === 'weekly' && (
                            <>
                              <button type="button" onClick={() => setFormData(prev => ({ ...prev, recurrenceInterval: 1 }))}
                                className={`px-3 py-1 text-xs border transition-colors font-primary ${formData.recurrenceInterval === 1 ? 'border-hud-border-accent bg-tactical-gold-light' : 'border-hud-border hover:border-hud-border-accent'}`}>
                                Weekly
                              </button>
                              <button type="button" onClick={() => setFormData(prev => ({ ...prev, recurrenceInterval: 2 }))}
                                className={`px-3 py-1 text-xs border transition-colors font-primary ${formData.recurrenceInterval === 2 ? 'border-hud-border-accent bg-tactical-gold-light' : 'border-hud-border hover:border-hud-border-accent'}`}>
                                Bi-weekly
                              </button>
                            </>
                          )}
                          {formData.recurrenceFrequency === 'monthly' && (
                            <>
                              <button type="button" onClick={() => setFormData(prev => ({ ...prev, recurrenceInterval: 1 }))}
                                className={`px-3 py-1 text-xs border transition-colors font-primary ${formData.recurrenceInterval === 1 ? 'border-hud-border-accent bg-tactical-gold-light' : 'border-hud-border hover:border-hud-border-accent'}`}>
                                Monthly
                              </button>
                              <button type="button" onClick={() => setFormData(prev => ({ ...prev, recurrenceInterval: 2 }))}
                                className={`px-3 py-1 text-xs border transition-colors font-primary ${formData.recurrenceInterval === 2 ? 'border-hud-border-accent bg-tactical-gold-light' : 'border-hud-border hover:border-hud-border-accent'}`}>
                                Bi-monthly
                              </button>
                              <button type="button" onClick={() => setFormData(prev => ({ ...prev, recurrenceInterval: 3 }))}
                                className={`px-3 py-1 text-xs border transition-colors font-primary ${formData.recurrenceInterval === 3 ? 'border-hud-border-accent bg-tactical-gold-light' : 'border-hud-border hover:border-hud-border-accent'}`}>
                                Quarterly
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Recurrence End Options */}
                    <div className="space-y-3">
                      <span className="text-sm font-medium text-hud-text-primary font-primary">Ends:</span>
                      
                      <div className="space-y-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="radio"
                            name="recurrenceEnd"
                            value="date"
                            checked={!!formData.recurrenceEndDate}
                            onChange={() => {}}
                            className="w-4 h-4"
                          />
                          <div className="flex items-center gap-2 flex-1">
                            <span className="text-sm text-hud-text-primary font-primary">On date:</span>
                            <input
                              type="date"
                              value={formData.recurrenceEndDate}
                              onChange={(e) => setFormData(prev => ({ ...prev, recurrenceEndDate: e.target.value }))}
                              min={formData.date}
                              className="p-2 border border-hud-border text-sm font-primary bg-white"
                            />
                          </div>
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="radio"
                            name="recurrenceEnd"
                            value="occurrences"
                            checked={!formData.recurrenceEndDate}
                            onChange={() => setFormData(prev => ({ ...prev, recurrenceEndDate: '' }))}
                            className="w-4 h-4"
                          />
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-hud-text-primary font-primary">After</span>
                            <input
                              type="number"
                              value={formData.recurrenceOccurrences}
                              onChange={(e) => setFormData(prev => ({ ...prev, recurrenceOccurrences: parseInt(e.target.value) || 1 }))}
                              min="1"
                              max="1000"
                              className="w-20 p-2 border border-hud-border text-sm text-center font-primary bg-white"
                            />
                            <span className="text-sm text-hud-text-primary font-primary">occurrences</span>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Goal Timeframe (Goals only) */}
          {formData.type === 'goal' && (
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-hud-text-primary font-primary uppercase tracking-wide">
                Goal Timeframe
              </label>
              <select
                value={formData.goalTimeframe}
                onChange={(e) => handleInputChange('goalTimeframe', e.target.value)}
                className="w-full p-3 border-2 border-hud-border focus:border-hud-border-accent bg-white font-primary"
              >
                {GOAL_TIMEFRAME_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Milestone Deadline */}
          {formData.type === 'milestone' && (
            <div className="space-y-2">
              <label htmlFor="deadline" className="block text-sm font-semibold text-hud-text-primary font-primary uppercase tracking-wide">
                Deadline
              </label>
              <input
                id="deadline"
                type="date"
                value={formData.deadline}
                onChange={(e) => handleInputChange('deadline', e.target.value)}
                className="w-full p-3 border-2 border-hud-border focus:border-hud-border-accent bg-white font-primary"
              />
            </div>
          )}

          {/* Priority and Client Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Priority */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-hud-text-primary font-primary uppercase tracking-wide">
                Priority
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PRIORITY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleInputChange('priority', option.value)}
                    className={`p-2 text-xs font-primary font-semibold uppercase tracking-wide transition-colors ${
                      formData.priority === option.value
                        ? option.color
                        : 'bg-light-grey text-medium-grey hover:bg-tactical-gold hover:text-hud-text-primary'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Client Selection */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-hud-text-primary font-primary uppercase tracking-wide">
                Client *
              </label>
              <ClientSelector
                selectedClientId={formData.clientId}
                selectedClientName={formData.clientName}
                onClientSelect={(client, isNonClient) => {
                  if (client) {
                    handleInputChange('clientId', isNonClient ? '' : client.id)
                    handleInputChange('clientName', client.name)
                  } else {
                    handleInputChange('clientId', '')
                    handleInputChange('clientName', '')
                  }
                }}
                onCreateClient={async (clientData) => {
                  // Create client in localStorage
                  const newClient: Client = {
                    ...clientData,
                    id: `client-${Date.now()}`,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                  }
                  
                  try {
                    const existingClients = JSON.parse(localStorage.getItem('clients') || '[]')
                    const updatedClients = [...existingClients, newClient]
                    localStorage.setItem('clients', JSON.stringify(updatedClients))
                    
                    // Update the local clients state to trigger re-render
                    setClients(updatedClients.map(c => ({ id: c.id, name: c.name })))
                    
                    console.log('✅ Client created successfully:', newClient.name)
                    return newClient
                  } catch (error) {
                    console.error('❌ Error creating client:', error)
                    throw new Error('Failed to create client')
                  }
                }}
                placeholder="Search for a client or enter name"
                allowNonClient={true}
              />
              {errors.clientName && (
                <p className="text-sm text-red-600 font-primary">{errors.clientName}</p>
              )}
            </div>
          </div>

          {/* Participants/Attendees */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-hud-text-primary font-primary uppercase tracking-wide">
              <User className="inline w-4 h-4 mr-2" />
              Participants/Attendees
            </label>
            <div className="space-y-3 p-4 border border-hud-border bg-hud-background-secondary rounded">
              <p className="text-xs text-medium-grey font-primary">
                Add email addresses of people who should receive notifications about this event
              </p>
              
              {formData.participants.length > 0 && (
                <div className="space-y-2">
                  {formData.participants.map((participant, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="email"
                        value={participant}
                        onChange={(e) => {
                          const newParticipants = [...formData.participants]
                          newParticipants[index] = e.target.value
                          setFormData(prev => ({ ...prev, participants: newParticipants }))
                        }}
                        placeholder="Enter email address"
                        className="flex-1 p-2 border border-hud-border focus:border-hud-border-accent bg-white font-primary rounded text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newParticipants = formData.participants.filter((_, i) => i !== index)
                          setFormData(prev => ({ ...prev, participants: newParticipants }))
                        }}
                        className="p-2 text-red-600 hover:text-red-800 transition-colors"
                        title="Remove participant"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <button
                type="button"
                onClick={() => {
                  setFormData(prev => ({ 
                    ...prev, 
                    participants: [...prev.participants, ''] 
                  }))
                }}
                className="flex items-center gap-2 px-3 py-2 border border-hud-border bg-white hover:bg-tactical-gold-light transition-colors font-primary text-sm rounded"
              >
                <Plus className="w-4 h-4" />
                Add Participant
              </button>
              
              {formData.participants.length > 0 && (
                <div className="text-xs text-medium-grey font-primary">
                  <Bell className="inline w-3 h-3 mr-1" />
                  {formData.participants.length} participant{formData.participants.length !== 1 ? 's' : ''} will receive event notifications
                </div>
              )}
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <label htmlFor="location" className="block text-sm font-semibold text-hud-text-primary font-primary uppercase tracking-wide">
              Location
            </label>
            <input
              id="location"
              type="text"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              className="w-full p-3 border-2 border-hud-border focus:border-hud-border-accent bg-white font-primary"
              placeholder="Enter location or address"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label htmlFor="notes" className="block text-sm font-semibold text-hud-text-primary font-primary uppercase tracking-wide">
              Notes
            </label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
              className="w-full p-3 border-2 border-hud-border focus:border-hud-border-accent bg-white font-primary"
              placeholder="Additional notes or details"
            />
          </div>

          {/* Notifications */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-hud-text-primary font-primary uppercase tracking-wide">
              <Bell className="inline w-4 h-4 mr-2" />
              Notifications
            </label>
            <div className="space-y-3">
              {/* Existing Notifications */}
              {formData.notifications.map((notification, index) => (
                <div key={notification.id} className="flex items-center gap-3 p-3 border border-hud-border bg-hud-background-secondary">
                  <input
                    type="number"
                    value={notification.value}
                    onChange={(e) => {
                      const newNotifications = [...formData.notifications]
                      newNotifications[index] = { ...notification, value: parseInt(e.target.value) || 0 }
                      setFormData(prev => ({ ...prev, notifications: newNotifications }))
                    }}
                    className="w-16 p-2 border border-hud-border text-sm text-center"
                    min="0"
                    max="999"
                  />
                  <select
                    value={notification.trigger}
                    onChange={(e) => {
                      const newNotifications = [...formData.notifications]
                      newNotifications[index] = { ...notification, trigger: e.target.value as NotificationTrigger }
                      setFormData(prev => ({ ...prev, notifications: newNotifications }))
                    }}
                    className="p-2 border border-hud-border text-sm font-primary bg-white"
                  >
                    <option value="minutes">minutes before</option>
                    <option value="hours">hours before</option>
                    <option value="days">days before</option>
                    <option value="weeks">weeks before</option>
                  </select>
                  <input
                    type="checkbox"
                    checked={notification.enabled}
                    onChange={(e) => {
                      const newNotifications = [...formData.notifications]
                      newNotifications[index] = { ...notification, enabled: e.target.checked }
                      setFormData(prev => ({ ...prev, notifications: newNotifications }))
                    }}
                    className="w-4 h-4"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const newNotifications = formData.notifications.filter((_, i) => i !== index)
                      setFormData(prev => ({ ...prev, notifications: newNotifications }))
                    }}
                    className="text-red-600 hover:text-red-800 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {/* Preset Notification Buttons */}
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-medium-grey font-primary uppercase tracking-wide">Quick add:</span>
                {PRESET_NOTIFICATIONS.slice(0, 6).map((preset) => (
                  <button
                    key={`${preset.value}-${preset.trigger}`}
                    type="button"
                    onClick={() => {
                      const newId = Date.now().toString()
                      const newNotification: NotificationRule = {
                        id: newId,
                        value: preset.value,
                        trigger: preset.trigger,
                        enabled: true
                      }
                      setFormData(prev => ({ 
                        ...prev, 
                        notifications: [...prev.notifications, newNotification] 
                      }))
                    }}
                    className="px-2 py-1 text-xs border border-hud-border bg-white hover:bg-tactical-gold-light transition-colors font-primary"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Add Custom Notification */}
              <button
                type="button"
                onClick={() => {
                  const newId = Date.now().toString()
                  const newNotification: NotificationRule = {
                    id: newId,
                    value: 10,
                    trigger: 'minutes',
                    enabled: true
                  }
                  setFormData(prev => ({ 
                    ...prev, 
                    notifications: [...prev.notifications, newNotification] 
                  }))
                }}
                className="flex items-center gap-2 px-3 py-2 border border-hud-border bg-white hover:bg-tactical-gold-light transition-colors font-primary text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Custom Notification
              </button>
            </div>
          </div>

          {/* Error Display */}
          {errors.general && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 font-primary text-sm">
              {errors.general}
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t border-hud-border">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="px-6"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="px-6"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-dark-grey border-t-transparent" />
                  Saving...
                </div>
              ) : (
                editingEvent ? 'Update Event' : 'Create Event'
              )}
            </Button>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="text-xs text-medium-grey font-primary text-center border-t border-hud-border pt-4">
            <span>Keyboard shortcuts: </span>
            <span className="font-semibold">Ctrl+Enter</span> to save, <span className="font-semibold">Esc</span> to cancel
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default EventCreationModal