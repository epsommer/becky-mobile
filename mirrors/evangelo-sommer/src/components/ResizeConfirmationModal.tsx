"use client"

import React, { useState } from 'react'
import { format, parseISO, differenceInMinutes } from 'date-fns'
import {
  Calendar,
  Clock,
  ArrowUpDown,
  User,
  MapPin,
  AlertTriangle,
  Mail,
  CheckCircle,
  X,
  Send
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { UnifiedEvent, Priority } from '@/components/EventCreationModal'

interface ResizeData {
  event: UnifiedEvent
  originalStart: string
  originalEnd: string
  newStart: string
  newEnd: string
  handle: 'top' | 'bottom'
  reason?: string
}

interface ResizeConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (data: ResizeData, notifyParticipants: boolean) => Promise<void>
  resizeData: ResizeData | null
}

const ResizeConfirmationModal: React.FC<ResizeConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  resizeData
}) => {
  const [isConfirming, setIsConfirming] = useState(false)
  const [notifyParticipants, setNotifyParticipants] = useState(true)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Fine-tuning states - allow adjustments in 15-minute intervals
  const [adjustedStart, setAdjustedStart] = useState('')
  const [adjustedEnd, setAdjustedEnd] = useState('')

  console.log('🎯 ResizeConfirmationModal render - isOpen:', isOpen, 'resizeData:', resizeData)

  // Initialize adjusted times when modal opens
  React.useEffect(() => {
    if (isOpen && resizeData) {
      setAdjustedStart(resizeData.newStart)
      setAdjustedEnd(resizeData.newEnd)
    }
  }, [isOpen, resizeData])

  // Handle keyboard shortcuts
  React.useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && !isConfirming) {
        event.preventDefault()
        handleConfirm()
      } else if (event.key === 'Escape' && !isConfirming) {
        event.preventDefault()
        handleClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, isConfirming])

  if (!resizeData) return null

  const { event, originalStart, originalEnd, newStart, newEnd, handle } = resizeData

  const getPriorityColor = (priority: Priority): string => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium':
        return 'bg-tactical-gold-light text-hud-text-primary border-tactical-gold'
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-tactical-grey-200 text-tactical-grey-700 border-tactical-grey-300'
    }
  }

  // Calculate duration changes - use adjusted times if available
  const originalDuration = differenceInMinutes(parseISO(originalEnd), parseISO(originalStart))
  const finalStart = adjustedStart || newStart
  const finalEnd = adjustedEnd || newEnd
  const finalDuration = differenceInMinutes(parseISO(finalEnd), parseISO(finalStart))
  const durationChange = finalDuration - originalDuration

  // Get participants info
  const getParticipantsInfo = () => {
    const participants = (event as any).participants || []
    if (event.clientName && !participants.includes(event.clientName)) {
      participants.push(event.clientName)
    }
    return participants
  }

  const participants = getParticipantsInfo()
  const hasParticipants = participants.length > 0

  const handleConfirm = async () => {
    console.log('🎯 ResizeConfirmationModal: handleConfirm clicked')

    if (!onConfirm || !resizeData) {
      setError('Resize confirmation function is not available')
      return
    }

    setIsConfirming(true)
    setError(null)

    try {
      const dataWithReason = {
        ...resizeData,
        newStart: finalStart,
        newEnd: finalEnd,
        reason: reason.trim() || undefined
      }

      await onConfirm(dataWithReason, notifyParticipants)
      onClose()
      setReason('')
    } catch (err) {
      console.error('🎯 Resize confirmation failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to resize event')
    } finally {
      setIsConfirming(false)
    }
  }

  const handleClose = () => {
    if (!isConfirming) {
      onClose()
      setReason('')
      setError(null)
    }
  }

  const formatTime = (datetime: string) => {
    return format(parseISO(datetime), 'h:mm a')
  }

  const formatDate = (datetime: string) => {
    return format(parseISO(datetime), 'EEEE, MMMM do, yyyy')
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white border-hud-border">
        <DialogHeader className="border-b border-hud-border pb-4">
          <DialogTitle className="flex items-center gap-3 text-xl font-primary font-semibold uppercase tracking-wide text-hud-text-primary">
            <ArrowUpDown className="w-6 h-6 text-tactical-gold" />
            Confirm Event Resize
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Event Info Card */}
          <Card className={`border-l-4 ${getPriorityColor(event.priority)}`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-primary flex items-center justify-between">
                <span>{event.title}</span>
                <Badge className={`${getPriorityColor(event.priority)} font-semibold uppercase text-xs`}>
                  {event.priority}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {event.description && (
                <p className="text-sm text-medium-grey font-primary">
                  {event.description}
                </p>
              )}

              <div className="flex flex-wrap gap-4 text-sm text-medium-grey font-primary">
                {event.clientName && (
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    <span>{event.clientName}</span>
                  </div>
                )}

                {event.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{event.location}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Resize Summary Card */}
          <Card className="border-hud-border">
            <CardContent className="p-6">
              <h3 className="font-semibold text-hud-text-primary font-primary uppercase tracking-wide mb-4">
                Duration Change
              </h3>

              <div className="space-y-4">
                {/* Original Duration */}
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="text-sm text-medium-grey font-primary uppercase tracking-wide mb-1">
                      Original Duration
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-red-600" />
                        <div>
                          <div className="font-semibold text-red-800 font-primary">
                            {formatTime(originalStart)} - {formatTime(originalEnd)}
                          </div>
                          <div className="text-sm text-red-600 font-primary">
                            {originalDuration} minutes
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <ArrowUpDown className="w-6 h-6 text-tactical-gold flex-shrink-0" />

                  {/* New Duration */}
                  <div className="flex-1">
                    <div className="text-sm text-medium-grey font-primary uppercase tracking-wide mb-1">
                      New Duration
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-green-600" />
                        <div>
                          <div className="font-semibold text-green-800 font-primary">
                            {formatTime(finalStart)} - {formatTime(finalEnd)}
                          </div>
                          <div className="text-sm text-green-600 font-primary">
                            {finalDuration} minutes
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Change Summary */}
                <div className="bg-hud-background-secondary border border-hud-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowUpDown className="w-4 h-4 text-tactical-gold" />
                    <span className="font-semibold text-hud-text-primary font-primary uppercase text-sm">
                      Resize Summary
                    </span>
                  </div>
                  <div className="text-sm text-medium-grey font-primary">
                    <span>
                      {handle === 'top' ? 'Start time' : 'End time'} moved by{' '}
                      <span className={`font-semibold ${durationChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {durationChange > 0 ? '+' : ''}{durationChange} minutes
                      </span>
                      {' '}({durationChange > 0 ? 'extended' : 'shortened'})
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Participants Notification */}
          {hasParticipants && (
            <Card className="border-hud-border">
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-tactical-gold" />
                    <h3 className="font-semibold text-hud-text-primary font-primary uppercase tracking-wide">
                      Participant Notifications
                    </h3>
                  </div>

                  <div className="bg-hud-background-secondary rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-hud-text-primary font-primary">
                        {participants.length} participant{participants.length !== 1 ? 's' : ''} will be notified:
                      </span>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notifyParticipants}
                          onChange={(e) => setNotifyParticipants(e.target.checked)}
                          className="w-4 h-4 border-2 border-hud-border"
                        />
                        <span className="text-sm font-medium text-hud-text-primary font-primary">
                          Send notifications
                        </span>
                      </label>
                    </div>

                    <div className="space-y-1">
                      {participants.map((participant: string, index: number) => (
                        <div key={index} className="flex items-center gap-2 text-sm text-medium-grey font-primary">
                          <User className="w-3 h-3" />
                          <span>{participant}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reason for Change */}
          <Card className="border-hud-border">
            <CardContent className="p-4">
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-hud-text-primary font-primary uppercase tracking-wide">
                  Reason for Resize (Optional)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter reason for resizing the event duration (will be included in notifications)"
                  className="w-full p-3 border-2 border-hud-border focus:border-hud-border-accent bg-white font-primary resize-none"
                  rows={3}
                />
                <div className="text-xs text-medium-grey font-primary">
                  {hasParticipants && notifyParticipants ?
                    'This reason will be included in participant notifications.' :
                    'This will be saved with the event for your records.'
                  }
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-red-800 font-primary text-sm">
                      Error
                    </div>
                    <div className="text-sm text-red-700 font-primary">
                      {error}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t border-hud-border">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isConfirming}
              className="px-6"
            >
              Cancel
            </Button>
            <Button
              onClick={(e) => {
                console.log('🎯 RESIZE BUTTON CLICKED!')
                e.preventDefault()
                e.stopPropagation()
                handleConfirm()
              }}
              disabled={isConfirming}
              className="px-6 bg-tactical-gold hover:bg-tactical-gold-light text-hud-text-primary"
            >
              {isConfirming ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-hud-text-primary border-t-transparent" />
                  {notifyParticipants && hasParticipants ? 'Resizing & Notifying...' : 'Resizing...'}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Confirm Resize
                  {notifyParticipants && hasParticipants && (
                    <Send className="w-4 h-4" />
                  )}
                </div>
              )}
            </Button>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="text-xs text-medium-grey font-primary text-center border-t border-hud-border pt-4">
            <span>Keyboard shortcuts: </span>
            <span className="font-semibold">Enter</span> to confirm, <span className="font-semibold">Esc</span> to cancel
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ResizeConfirmationModal