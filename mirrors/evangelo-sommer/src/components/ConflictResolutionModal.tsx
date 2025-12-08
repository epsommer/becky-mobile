"use client"

import React, { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { 
  AlertTriangle, 
  Clock, 
  User, 
  MapPin, 
  CheckCircle, 
  XCircle, 
  ArrowRight,
  Calendar,
  Bell,
  MessageSquare
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UnifiedEvent } from '@/components/EventCreationModal'
import { 
  ConflictResult, 
  ConflictDetail, 
  ResolutionSuggestion, 
  ResolutionStrategy,
  ConflictSeverity 
} from '@/lib/conflict-detector'
import { ConflictResolutionClientService } from '@/lib/conflict-resolution-client'

interface ConflictResolutionModalProps {
  isOpen: boolean
  proposedEvent: UnifiedEvent
  conflicts: ConflictResult
  onAcceptConflict: (conflictId: string) => void
  onDeleteEvent: (conflictId: string, eventId: string) => Promise<void>
  onRescheduleEvent: (conflictId: string, eventId: string) => void
  onAcceptSave?: () => Promise<void>
  onCancel: () => void
  onClose: () => void
}

const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  isOpen,
  proposedEvent,
  conflicts,
  onAcceptConflict,
  onDeleteEvent,
  onRescheduleEvent,
  onAcceptSave,
  onCancel,
  onClose
}) => {
  // Debug: Log conflicts when modal opens or conflicts change
  useEffect(() => {
    if (isOpen && conflicts) {
      console.log('🔥 ConflictResolutionModal received conflicts update:', {
        conflictCount: conflicts.conflicts.length,
        conflictIds: conflicts.conflicts.map(c => c.id),
        timestamp: new Date().toISOString()
      })

      // Check for duplicate event IDs
      const eventIds = conflicts.conflicts.map(c => c.conflictingEvent?.id).filter(Boolean)
      const uniqueEventIds = [...new Set(eventIds)]
      console.log(`🔥 Total conflicts: ${conflicts.conflicts.length}, Unique event IDs: ${uniqueEventIds.length}`)

      if (eventIds.length !== uniqueEventIds.length) {
        console.warn(`⚠️  DUPLICATE EVENT IDs DETECTED! This may cause multiple conflicts to be deleted when deleting one event.`)
        console.log(`🔥 Event IDs:`, eventIds)
        console.log(`🔥 Unique event IDs:`, uniqueEventIds)

        // Group conflicts by event ID
        const eventGroups = new Map<string, number>()
        eventIds.forEach(id => {
          eventGroups.set(id, (eventGroups.get(id) || 0) + 1)
        })
        eventGroups.forEach((count, eventId) => {
          if (count > 1) {
            console.warn(`⚠️  Event ID ${eventId} appears in ${count} conflicts`)
          }
        })
      }

      conflicts.conflicts.forEach((conflict, index) => {
        console.log(`🔥 Conflict ${index + 1}:`)
        console.log(`  - Conflict ID: ${conflict.id}`)
        console.log(`  - Event ID: ${conflict.conflictingEvent?.id}`)
        console.log(`  - Event Title: ${conflict.conflictingEvent?.title}`)
        console.log(`  - Conflict Type: ${conflict.type}`)
        console.log(`  - Message: ${conflict.message}`)
      })
    }
  }, [isOpen, conflicts])

  // Reset selected conflicts when conflicts change (after deletions)
  useEffect(() => {
    if (conflicts) {
      const validConflictIds = new Set(conflicts.conflicts.map(c => c.id))
      setSelectedConflicts(prev => new Set([...prev].filter(id => validConflictIds.has(id))))
    }
  }, [conflicts])
  const [viewMode, setViewMode] = useState<'priority' | 'timeline' | 'impact'>('priority')
  const [selectedConflicts, setSelectedConflicts] = useState<Set<string>>(new Set())
  const [stagedDeletions, setStagedDeletions] = useState<Set<string>>(new Set()) // Track staged event deletions
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [pendingDeleteAction, setPendingDeleteAction] = useState<{type: 'single' | 'bulk', conflictIds: string[], eventIds: string[]} | null>(null)

  // Lock body scroll and apply modal-open class when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      document.body.classList.add('modal-open')
    } else {
      document.body.style.overflow = 'unset'
      document.body.classList.remove('modal-open')
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset'
      document.body.classList.remove('modal-open')
    }
  }, [isOpen])


  if (!isOpen) return null

  // Get severity-based styling
  const getSeverityColor = (severity: ConflictSeverity): string => {
    switch (severity) {
      case 'critical':
        return 'text-red-300 bg-red-900/20 border-red-800/30'
      case 'error':
        return 'text-orange-300 bg-orange-900/20 border-orange-800/30'
      case 'warning':
        return 'text-yellow-300 bg-yellow-900/20 border-yellow-800/30'
      default:
        return 'text-tactical-grey-300 bg-tactical-grey-800/20 border-tactical-grey-600/30'
    }
  }

  const getSeverityIcon = (severity: ConflictSeverity) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      default:
        return <AlertTriangle className="w-4 h-4 text-tactical-grey-500" />
    }
  }

  // Format time for display
  const formatTime = (dateTime: string) => {
    return format(parseISO(dateTime), 'MMM dd, yyyy \'at\' h:mm a')
  }

  const formatTimeRange = (start: Date, end: Date) => {
    return `${format(start, 'MMM dd, yyyy \'at\' h:mm a')} - ${format(end, 'h:mm a')}`
  }

  // Enhanced conflict analysis functions
  const getClientPriority = (clientName: string) => {
    // Priority scoring based on client type and relationship
    const priorityMap: { [key: string]: number } = {
      'Evan Sommer (Mock Client)': 8, // High-value repeat client
      'Mark Levy': 7, // Established client
    }
    return priorityMap[clientName] || 5 // Default priority
  }

  const getRevenueImpact = (event: UnifiedEvent | ConflictDetail) => {
    // Estimate revenue impact based on service type and duration
    const serviceMultipliers = {
      'landscaping': 75, // $ per hour
      'snow_removal': 50,
      'creative_development': 100,
      'consultation': 150
    }

    let multiplier = 75 // default
    if ('serviceType' in event && event.serviceType) {
      multiplier = serviceMultipliers[event.serviceType as keyof typeof serviceMultipliers] || 75
    }

    // Calculate duration in hours
    // Type guard to check if event is ConflictDetail
    const isConflictDetail = (e: UnifiedEvent | ConflictDetail): e is ConflictDetail => {
      return 'conflictingEvent' in e
    }

    const startValue = 'startDateTime' in event ? event.startDateTime :
      isConflictDetail(event) ? event.conflictingEvent.startDateTime : new Date()
    const endValue = 'endDateTime' in event ? event.endDateTime :
      isConflictDetail(event) ? event.conflictingEvent.endDateTime : new Date()

    const start = new Date(startValue || new Date())
    const end = new Date(endValue || new Date())
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)

    return multiplier * durationHours
  }

  const organizeConflictsByPriority = () => {
    return [...conflicts.conflicts].sort((a, b) => {
      // Sort by severity first, then by client priority, then by revenue impact
      const severityOrder: Record<ConflictSeverity, number> = { 'critical': 3, 'error': 2, 'warning': 1 }
      const severityDiff = (severityOrder[b.severity] ?? 0) - (severityOrder[a.severity] ?? 0)
      
      if (severityDiff !== 0) return severityDiff
      
      const clientPriorityA = getClientPriority(a.conflictingEvent?.clientName || '')
      const clientPriorityB = getClientPriority(b.conflictingEvent?.clientName || '')
      const priorityDiff = clientPriorityB - clientPriorityA
      
      if (priorityDiff !== 0) return priorityDiff
      
      return getRevenueImpact(b) - getRevenueImpact(a)
    })
  }

  const organizeConflictsByTimeline = () => {
    return [...conflicts.conflicts].sort((a, b) => {
      const timeA = new Date(a.conflictingEvent?.startDateTime || '').getTime()
      const timeB = new Date(b.conflictingEvent?.startDateTime || '').getTime()
      return timeA - timeB
    })
  }

  const organizeConflictsByImpact = () => {
    return [...conflicts.conflicts].sort((a, b) => {
      return getRevenueImpact(b) - getRevenueImpact(a)
    })
  }

  const getOrganizedConflicts = () => {
    switch (viewMode) {
      case 'priority': return organizeConflictsByPriority()
      case 'timeline': return organizeConflictsByTimeline()
      case 'impact': return organizeConflictsByImpact()
      default: return conflicts.conflicts
    }
  }

  const getConflictInsight = (conflict: ConflictDetail) => {
    const clientPriority = getClientPriority(conflict.conflictingEvent?.clientName || '')
    const revenueImpact = getRevenueImpact(conflict)

    let insights = []

    if (clientPriority >= 8) insights.push('High-value client')
    if (revenueImpact > 200) insights.push(`$${Math.round(revenueImpact)} revenue impact`)
    if (conflict.severity === 'critical') insights.push('Critical conflict')

    return insights.join(' • ')
  }

  // Handle immediate conflict actions
  const handleAcceptConflictImmediate = async (conflictId: string) => {
    console.log(`✅ Accepting conflict immediately: ${conflictId}`)
    console.log(`🔥 ConflictModal: Current conflicts count before acceptance: ${conflicts.conflicts.length}`)

    // Find the conflict details
    const conflict = conflicts.conflicts.find(c => c.id === conflictId)
    if (!conflict) {
      console.error('Could not find conflict details for:', conflictId)
      return
    }

    try {
      // Persist the resolution to database
      await ConflictResolutionClientService.saveResolution({
        conflictId: conflictId,
        conflictType: conflict.type,
        resolutionType: conflict.conflictingEvent.id === proposedEvent.id ? 'OVERRIDE' : 'ACCEPT',
        affectedEventIds: [conflict.conflictingEvent.id, proposedEvent.id],
        conflictMessage: conflict.message,
        resolutionData: {
          action: 'accept_immediate',
          timestamp: new Date().toISOString(),
          userChoice: 'accept'
        }
      })

      console.log(`✅ Conflict resolution persisted to database: ${conflictId}`)
    } catch (error) {
      console.error('Failed to persist conflict resolution:', error)
    }

    // Call the original handler
    if (typeof onAcceptConflict === 'function') {
      console.log(`🔥 ConflictModal: Calling parent onAcceptConflict handler for: ${conflictId}`)
      onAcceptConflict(conflictId)
      console.log(`🔥 ConflictModal: Parent handler called, conflicts count should update soon`)
    } else {
      console.error('onAcceptConflict is not a function:', typeof onAcceptConflict)
    }
  }

  const handleStageDeleteEvent = (conflictId: string, eventId: string) => {
    console.log(`🗑️ Staging event for deletion: ${eventId} for conflict: ${conflictId}`)

    // Toggle staged deletion for this event
    setStagedDeletions(prev => {
      const newStaged = new Set(prev)
      if (newStaged.has(eventId)) {
        newStaged.delete(eventId)
        console.log(`🔥 Removed ${eventId} from staged deletions`)
      } else {
        newStaged.add(eventId)
        console.log(`🔥 Added ${eventId} to staged deletions`)
      }
      return newStaged
    })
  }

  const handleExecuteStagedDeletions = async () => {
    console.log(`🗑️ Executing staged deletions: ${stagedDeletions.size} events`)

    if (stagedDeletions.size === 0) {
      console.log(`🔥 No staged deletions to execute`)
      return
    }

    // Convert staged deletions to conflict/event pairs for deletion
    const deletionsToExecute: {conflictId: string, eventId: string}[] = []

    for (const eventId of stagedDeletions) {
      // Find the first conflict that references this event
      const conflict = conflicts?.conflicts.find(c => c.conflictingEvent.id === eventId)
      if (conflict) {
        deletionsToExecute.push({conflictId: conflict.id, eventId})
      }
    }

    console.log(`🔥 Executing ${deletionsToExecute.length} deletions:`, deletionsToExecute)

    // Execute all staged deletions
    for (const {conflictId, eventId} of deletionsToExecute) {
      try {
        // Find all conflicts that reference this event for resolution persistence
        const conflictsForEvent = conflicts?.conflicts.filter(c => c.conflictingEvent.id === eventId) || []

        // Persist resolution to database for all conflicts referencing this event
        for (const conflict of conflictsForEvent) {
          await ConflictResolutionClientService.saveResolution({
            conflictId: conflict.id,
            conflictType: conflict.type,
            resolutionType: 'DELETE',
            affectedEventIds: [eventId, proposedEvent.id],
            conflictMessage: conflict.message,
            resolutionData: {
              action: 'staged_delete_event',
              timestamp: new Date().toISOString(),
              deletedEventId: eventId,
              deletedEventTitle: conflict.conflictingEvent?.title
            }
          })
          console.log(`✅ Staged delete resolution persisted: ${conflict.id}`)
        }

        // Execute the deletion
        await onDeleteEvent(conflictId, eventId)
        console.log(`✅ Staged deletion executed: ${eventId}`)
      } catch (error) {
        console.error(`❌ Failed to execute staged deletion for ${eventId}:`, error)
      }
    }

    // Clear staged deletions after execution
    setStagedDeletions(new Set())
    console.log(`✅ All staged deletions executed and cleared`)
  }

  const handleSaveWithStagedDeletions = async () => {
    console.log(`🔥 Save clicked - executing staged deletions first`)

    try {
      // Execute staged deletions first
      await handleExecuteStagedDeletions()

      // Then call the original save handler
      if (onAcceptSave) {
        await onAcceptSave()
      } else {
        console.error('onAcceptSave is not provided!')
        onClose()
      }
    } catch (error) {
      console.error('Error during save with staged deletions:', error)
    }
  }

  const handleCancel = () => {
    console.log(`🔥 Cancel clicked - clearing staged deletions`)
    setStagedDeletions(new Set()) // Clear staged deletions on cancel
    onCancel() // Call the original cancel handler
  }

  const handleClose = () => {
    console.log(`🔥 Close clicked - clearing staged deletions`)
    setStagedDeletions(new Set()) // Clear staged deletions on close
    onClose() // Call the original close handler
  }

  const handleRescheduleEventImmediate = (conflictId: string, eventId: string) => {
    console.log(`📅 Rescheduling event immediately: ${eventId} for conflict: ${conflictId}`)
    onRescheduleEvent(conflictId, eventId)
  }

  // Handle bulk selection
  const handleConflictSelect = (conflictId: string, checked: boolean) => {
    const newSelected = new Set(selectedConflicts)
    if (checked) {
      newSelected.add(conflictId)
    } else {
      newSelected.delete(conflictId)
    }
    setSelectedConflicts(newSelected)
  }

  const handleBulkDelete = () => {
    const conflictIds = Array.from(selectedConflicts)

    // Create a map to ensure we only delete each unique event once
    const eventToConflictMap = new Map<string, string>() // eventId -> conflictId
    const uniqueEventIds: string[] = []
    const uniqueConflictIds: string[] = []

    conflictIds.forEach(conflictId => {
      const conflict = conflicts.conflicts.find(c => c.id === conflictId)
      const eventId = conflict?.conflictingEvent.id

      if (eventId && !eventToConflictMap.has(eventId)) {
        eventToConflictMap.set(eventId, conflictId)
        uniqueEventIds.push(eventId)
        uniqueConflictIds.push(conflictId)
      }
    })

    console.log(`🔥 Bulk delete: ${conflictIds.length} conflicts selected, ${uniqueEventIds.length} unique events to delete`)

    setPendingDeleteAction({
      type: 'bulk',
      conflictIds: conflictIds, // Show all selected conflicts in confirmation
      eventIds: uniqueEventIds  // But only delete unique events
    })
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    console.log('🔥 confirmDelete called with pendingDeleteAction:', pendingDeleteAction)

    if (pendingDeleteAction) {
      console.log(`🔥 About to delete ${pendingDeleteAction.eventIds.length} events:`)

      // Process deletions sequentially to avoid race conditions
      let deletionCount = 0
      const totalDeletions = pendingDeleteAction.eventIds.length

      // Process each unique event to delete (fixes bug where multiple conflicts reference same event)
      for (let index = 0; index < pendingDeleteAction.eventIds.length; index++) {
        const eventId = pendingDeleteAction.eventIds[index]

        // Find all conflicts that reference this event
        const conflictsForEvent = pendingDeleteAction.conflictIds
          .map(conflictId => conflicts?.conflicts.find(c => c.id === conflictId))
          .filter((conflict): conflict is ConflictDetail => !!conflict && conflict.conflictingEvent.id === eventId)

        if (conflictsForEvent.length === 0) continue

        const firstConflict = conflictsForEvent[0]
        console.log(`🔥 Processing deletion ${index + 1}: eventId=${eventId}, conflicts=${conflictsForEvent.length}`)
        console.log(`🔥 Deleting event: ${firstConflict.conflictingEvent?.title} (ID: ${eventId})`)

        if (eventId) {
          // Call the deletion handler and wait for completion
          try {
            // First, persist the resolution to database for all conflicts referencing this event
            for (const conflict of conflictsForEvent) {
              await ConflictResolutionClientService.saveResolution({
                conflictId: conflict.id,
                conflictType: conflict.type,
                resolutionType: 'DELETE',
                affectedEventIds: [eventId, proposedEvent.id],
                conflictMessage: conflict.message,
                resolutionData: {
                  action: 'delete_event',
                  timestamp: new Date().toISOString(),
                  deletedEventId: eventId,
                  deletedEventTitle: conflict.conflictingEvent?.title
                }
              })
              console.log(`✅ Delete resolution persisted to database: ${conflict.id}`)
            }

            // Then perform the actual deletion (only once per unique event)
            await onDeleteEvent(firstConflict.id, eventId)
            deletionCount++
            console.log(`🔥 Completed deletion ${deletionCount}/${totalDeletions} for eventId: ${eventId} (resolved ${conflictsForEvent.length} conflicts)`)
          } catch (error) {
            console.error(`❌ Failed to delete event ${eventId}:`, error)
          }
        } else {
          console.warn(`⚠️  No eventId found at index ${index}`)
          deletionCount++ // Still count as processed
        }
      }

      console.log(`🔥 All ${deletionCount} deletions processed sequentially`)
    } else {
      console.warn('⚠️  No pendingDeleteAction found!')
    }

    setShowDeleteConfirm(false)
    setPendingDeleteAction(null)
    setSelectedConflicts(new Set())
    // Note: Modal stays open for additional actions
  }

  // Handle select all toggle
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Only select conflicts that have external events to delete (not business rules)
      const selectableConflicts = conflicts.conflicts
        .filter(conflict => conflict.conflictingEvent.id !== proposedEvent.id)
        .map(c => c.id)
      setSelectedConflicts(new Set(selectableConflicts))
    } else {
      setSelectedConflicts(new Set())
    }
  }

  const canProceed = conflicts.canProceed
  const criticalConflicts = conflicts.conflicts.filter(c => c.severity === 'critical')
  const hasCriticalConflicts = criticalConflicts.length > 0

  return (
    <div
      className="fixed inset-0 z-[99999] bg-black/70 dark:bg-black/50 flex items-center justify-center p-4"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh'
      }}
    >
      <div
        className="bg-white dark:bg-tactical-grey-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative z-[100000]"
        style={{
          marginLeft: 'max(16rem, 20%)', // Account for sidebar (256px) or minimum 20% for collapsed
          marginTop: '5rem',              // 80px (pt-20) for header
          marginRight: '1rem',
          marginBottom: '1rem',
          maxWidth: 'calc(100vw - 17rem)' // Ensure it doesn't overflow when sidebar is expanded
        }}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-900/30 rounded-full">
                <AlertTriangle className="w-6 h-6 text-orange-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-tactical-grey-100">
                  Schedule Conflict Detected
                </h2>
                <p className="text-gray-600 dark:text-tactical-grey-300">
                  {conflicts.conflicts.length} conflict{conflicts.conflicts.length > 1 ? 's' : ''} found with your proposed event
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-tactical-grey-500 transition-colors"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>

          {/* Proposed Event Details */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Proposed Event
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2">{proposedEvent.title}</h3>
                  
                  {/* Proposed Event Insights */}
                  <div className="mb-3 flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      ${Math.round(getRevenueImpact(proposedEvent))} Potential Revenue
                    </Badge>
                    {proposedEvent.clientName && getClientPriority(proposedEvent.clientName) >= 8 && (
                      <Badge variant="outline" className="text-xs border-tactical-gold-500 text-tactical-brown-dark">
                        VIP Client
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-tactical-grey-500" />
                      <span>{formatTime(proposedEvent.startDateTime)}</span>
                    </div>
                    {proposedEvent.clientName && (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-tactical-grey-500" />
                        <span>{proposedEvent.clientName}</span>
                        {getClientPriority(proposedEvent.clientName) >= 7 && (
                          <span className="text-tactical-gold text-xs">• Priority Client</span>
                        )}
                      </div>
                    )}
                    {proposedEvent.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-tactical-grey-500" />
                        <span>{proposedEvent.location}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-center">
                  <Badge 
                    variant="outline" 
                    className={`text-sm px-3 py-1 ${
                      proposedEvent.priority === 'urgent' ? 'border-red-500 text-red-700' :
                      proposedEvent.priority === 'high' ? 'border-orange-500 text-orange-700' :
                      proposedEvent.priority === 'medium' ? 'border-yellow-500 text-yellow-700' :
                      'border-green-500 text-green-700'
                    }`}
                  >
                    {proposedEvent.priority.toUpperCase()} Priority
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Conflicts List */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Detected Conflicts ({conflicts.conflicts.length})
                </CardTitle>

                {/* Bulk Actions */}
                {selectedConflicts.size > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleBulkDelete}
                      className="px-3 py-1.5 text-xs font-medium rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
                    >
                      Remove Selected ({selectedConflicts.size})
                    </button>
                    <button
                      onClick={() => setSelectedConflicts(new Set())}
                      className="px-3 py-1.5 text-xs font-medium rounded-md bg-tactical-grey-600 text-white hover:bg-tactical-grey-700 transition-colors"
                    >
                      Clear Selection
                    </button>
                  </div>
                )}
              </div>

              {/* Select All Checkbox and Organize Options */}
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="select-all"
                    checked={(() => {
                      const selectableConflicts = conflicts.conflicts.filter(conflict => conflict.conflictingEvent.id !== proposedEvent.id)
                      return selectedConflicts.size === selectableConflicts.length && selectableConflicts.length > 0
                    })()}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="select-all" className="text-sm text-tactical-grey-300">
                    Select all deletable conflicts
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-tactical-grey-500 mr-2">Organize by:</span>
                  <div className="flex bg-tactical-grey-200 rounded-lg p-1">
                    {[
                      { key: 'priority', label: 'Priority', icon: '🎯' },
                      { key: 'timeline', label: 'Time', icon: '⏰' },
                      { key: 'impact', label: 'Revenue', icon: '💰' }
                    ].map((mode) => (
                      <button
                        key={mode.key}
                        onClick={() => setViewMode(mode.key as any)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1 ${
                          viewMode === mode.key
                            ? 'bg-tactical-grey-700 text-tactical-gold shadow-sm'
                            : 'text-tactical-grey-400 hover:text-tactical-grey-200'
                        }`}
                      >
                        <span>{mode.icon}</span>
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {getOrganizedConflicts().map((conflict, index) => (
                  <div
                    key={conflict.id}
                    className={`p-4 rounded-lg border ${getSeverityColor(conflict.severity)} relative`}
                  >
                    {/* Priority Ranking Badge */}
                    <div className="absolute top-2 right-2">
                      <Badge variant="secondary" className="text-xs">
                        #{index + 1} Priority
                      </Badge>
                    </div>

                    <div className="flex items-start gap-3">
                      {/* Checkbox for bulk selection */}
                      <input
                        type="checkbox"
                        checked={selectedConflicts.has(conflict.id)}
                        onChange={(e) => handleConflictSelect(conflict.id, e.target.checked)}
                        disabled={conflict.conflictingEvent.id === proposedEvent.id}
                        className={`mt-1 rounded ${
                          conflict.conflictingEvent.id === proposedEvent.id
                            ? 'opacity-50 cursor-not-allowed'
                            : ''
                        }`}
                      />
                      {getSeverityIcon(conflict.severity)}
                      <div className="flex-1 pr-20">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium capitalize">
                            {conflict.type.replace('_', ' ')}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {conflict.severity.toUpperCase()}
                          </Badge>
                        </div>

                        {/* Smart Insights */}
                        {getConflictInsight(conflict) && (
                          <div className="mb-2 text-xs text-tactical-gold font-medium">
                            💡 {getConflictInsight(conflict)}
                          </div>
                        )}

                        <p className="text-sm mb-3">{conflict.message}</p>
                        
                        {/* Enhanced Conflicting Event Details */}
                        {conflict.conflictingEvent.id !== proposedEvent.id && (
                          <div className="bg-tactical-grey-800/50 p-3 rounded border border-tactical-grey-600/30">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium">Conflicting Event:</h4>
                              <div className="flex items-center gap-2">
                                {getClientPriority(conflict.conflictingEvent.clientName || '') >= 8 && (
                                  <Badge variant="outline" className="text-xs border-gold text-gold">
                                    VIP Client
                                  </Badge>
                                )}
                                <Badge variant="outline" className="text-xs">
                                  ${Math.round(getRevenueImpact(conflict))} Revenue
                                </Badge>
                              </div>
                            </div>
                            <div className="text-sm space-y-1">
                              <div className="font-medium">{conflict.conflictingEvent.title}</div>
                              <div className="flex items-center gap-2 text-tactical-grey-500">
                                <Clock className="w-3 h-3" />
                                {formatTime(conflict.conflictingEvent.startDateTime)}
                              </div>
                              {conflict.conflictingEvent.clientName && (
                                <div className="flex items-center gap-2 text-tactical-grey-500">
                                  <User className="w-3 h-3" />
                                  <span>{conflict.conflictingEvent.clientName}</span>
                                  {getClientPriority(conflict.conflictingEvent.clientName) >= 7 && (
                                    <span className="text-tactical-gold text-xs">• Priority Client</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Time Overlap Details */}
                        {conflict.timeOverlap && (
                          <div className="mt-2 text-xs text-tactical-grey-500">
                            Overlap: {conflict.timeOverlap.durationMinutes} minutes
                          </div>
                        )}

                        {/* Business Rule Explanation */}
                        {conflict.conflictingEvent.id === proposedEvent.id && (
                          <div className="mt-3 p-2 bg-blue-900/20 border border-blue-800/30 rounded text-xs text-blue-300">
                            💡 <strong>Policy Conflict:</strong> This is a business rule violation with your proposed event.
                            You can accept it to override the policy, or cancel to choose a different time.
                          </div>
                        )}

                        {/* Immediate Action Buttons */}
                        <div className="mt-4 flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => handleAcceptConflictImmediate(conflict.id)}
                            className="px-3 py-1.5 text-xs font-medium rounded-md bg-orange-600 text-white hover:bg-orange-700 transition-colors"
                          >
                            {conflict.conflictingEvent.id === proposedEvent.id ? 'Override Policy' : 'Accept Conflict'}
                          </button>
                          {/* Only show delete/reschedule buttons for conflicts with external events */}
                          {conflict.conflictingEvent.id !== proposedEvent.id && (
                            <>
                              <button
                                onClick={() => handleStageDeleteEvent(conflict.id, conflict.conflictingEvent.id)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                  stagedDeletions.has(conflict.conflictingEvent.id)
                                    ? 'bg-orange-600 text-white hover:bg-orange-700'
                                    : 'bg-red-600 text-white hover:bg-red-700'
                                }`}
                              >
                                {stagedDeletions.has(conflict.conflictingEvent.id)
                                  ? 'Undo Remove'
                                  : 'Remove Conflicting Event'
                                }
                              </button>
                              <button
                                onClick={() => handleRescheduleEventImmediate(conflict.id, conflict.conflictingEvent.id)}
                                className="px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                              >
                                Reschedule Event
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>


          {/* Critical Warning */}
          {hasCriticalConflicts && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-800/30 rounded-lg">
              <div className="flex items-center gap-3">
                <XCircle className="w-5 h-5 text-red-400" />
                <div>
                  <h4 className="font-medium text-red-300">Critical Conflicts Detected</h4>
                  <p className="text-sm text-red-400">
                    This event cannot be scheduled without resolving critical conflicts first.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-center gap-3 pt-4 border-t">
            {conflicts.conflicts.length === 0 ? (
              <div className="text-center">
                <div className="mb-4 p-3 bg-green-900/20 border border-green-800/30 rounded-lg">
                  <div className="flex items-center justify-center gap-2 text-green-300">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">All conflicts resolved!</span>
                  </div>
                  <p className="text-sm text-green-400 mt-1">
                    Click "Save" to create the event, or "Cancel" to abort.
                  </p>
                </div>
                <div className="flex gap-3 justify-center">
                  <Button
                    onClick={handleSaveWithStagedDeletions}
                    className="bg-tactical-gold hover:bg-tactical-gold-dark text-hud-text-primary min-w-[120px]"
                  >
                    Save
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    className="min-w-[120px]"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (() => {
              // Check if all remaining conflicts are business rules that can be overridden
              const remainingConflicts = conflicts.conflicts.filter(c => c.type !== 'business_rule' || c.severity === 'critical')
              const canProceedWithOverride = remainingConflicts.length === 0

              return (
                <div className="text-center">
                  <div className={`mb-4 p-3 border rounded-lg ${canProceedWithOverride ? 'bg-blue-900/20 border-blue-800/30' : 'bg-yellow-900/20 border-yellow-800/30'}`}>
                    <div className={`flex items-center justify-center gap-2 ${canProceedWithOverride ? 'text-blue-300' : 'text-yellow-300'}`}>
                      {canProceedWithOverride ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                      <span className="font-medium">
                        {canProceedWithOverride ? 'Ready to proceed with overrides' : 'Conflicts require resolution'}
                      </span>
                    </div>
                    <p className={`text-sm mt-1 ${canProceedWithOverride ? 'text-blue-400' : 'text-yellow-400'}`}>
                      {canProceedWithOverride
                        ? 'Business rule warnings have been accepted. Click "Create Event" to proceed, or "Cancel" to abort.'
                        : 'Resolve conflicts above, then click "Accept" to save your resolution choices, or "Cancel" to abort.'
                      }
                    </p>
                  </div>
                  <div className="flex gap-3 justify-center">
                    <Button
                      onClick={handleSaveWithStagedDeletions}
                      className="bg-tactical-gold hover:bg-tactical-gold-dark text-hud-text-primary min-w-[120px]"
                    >
                      {canProceedWithOverride ? 'Create Event' : 'Accept'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCancel}
                      className="min-w-[120px]"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && pendingDeleteAction && (
        <div
          className="fixed inset-0 z-[100001] bg-black/70 dark:bg-black/50 flex items-center justify-center p-4"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh'
          }}
        >
          <div
            className="bg-white dark:bg-tactical-grey-900 rounded-lg shadow-xl max-w-md w-full"
            style={{
              marginLeft: 'max(16rem, 20%)', // Account for sidebar or collapsed state
              marginTop: '5rem',              // 80px (pt-20) for header
              marginRight: '1rem',
              marginBottom: '1rem',
              maxWidth: 'calc(100vw - 17rem)' // Ensure it doesn't overflow
            }}
          >
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-900/30 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-tactical-grey-100">
                    Delete Conflicting Event?
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-tactical-grey-300">
                    This will remove the existing scheduled event to make room for your new event
                  </p>
                </div>
              </div>

              <div className="text-gray-600 dark:text-tactical-grey-300 mb-6">
                <p className="mb-3">
                  Are you sure you want to delete {pendingDeleteAction.type === 'bulk'
                    ? `${pendingDeleteAction.eventIds.length} conflicting events`
                    : 'this conflicting event'}? This will clear the schedule conflict and allow your new event to be created.
                </p>
                {pendingDeleteAction.type === 'single' && pendingDeleteAction.conflictIds.length > 0 && (
                  <div className="p-3 bg-gray-100 dark:bg-tactical-grey-800 rounded-md">
                    {(() => {
                      const conflictId = pendingDeleteAction.conflictIds[0]
                      const conflict = conflicts?.conflicts.find(c => c.id === conflictId)
                      return conflict ? (
                        <div>
                          <p className="font-semibold text-sm">Conflicting event to be removed:</p>
                          <p className="text-base font-bold text-red-600 dark:text-red-400">
                            {conflict.conflictingEvent?.title || 'Unknown Event'}
                          </p>
                          {conflict.conflictingEvent?.clientName && (
                            <p className="text-sm opacity-75">
                              Client: {conflict.conflictingEvent.clientName}
                            </p>
                          )}
                        </div>
                      ) : null
                    })()}
                  </div>
                )}
                {pendingDeleteAction.type === 'bulk' && (
                  <div className="p-3 bg-gray-100 dark:bg-tactical-grey-800 rounded-md max-h-32 overflow-y-auto">
                    <p className="font-semibold text-sm mb-2">Conflicting events to be removed:</p>
                    {pendingDeleteAction.conflictIds.map((conflictId, index) => {
                      const conflict = conflicts?.conflicts.find(c => c.id === conflictId)
                      return conflict ? (
                        <p key={conflictId} className="text-sm font-medium text-red-600 dark:text-red-400">
                          • {conflict.conflictingEvent?.title || 'Unknown Event'}
                        </p>
                      ) : null
                    })}
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setPendingDeleteAction(null)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmDelete}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Remove {pendingDeleteAction.type === 'bulk' ? 'Conflicting Events' : 'Conflicting Event'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ConflictResolutionModal