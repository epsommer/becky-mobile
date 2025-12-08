"use client"

import React, { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { 
  Calendar, 
  Clock, 
  ArrowRight, 
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

interface TimeSlot {
  date: string
  hour: number
}

interface RescheduleData {
  event: UnifiedEvent
  fromSlot: TimeSlot
  toSlot: TimeSlot
  reason?: string
}

interface RescheduleConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (data: RescheduleData, notifyParticipants: boolean) => Promise<void>
  rescheduleData: RescheduleData | null
}

const RescheduleConfirmationModal: React.FC<RescheduleConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  rescheduleData
}) => {
  const [isConfirming, setIsConfirming] = useState(false)
  const [notifyParticipants, setNotifyParticipants] = useState(true)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  console.log('🎯 RescheduleConfirmationModal render - isOpen:', isOpen, 'rescheduleData:', rescheduleData)
  console.log('🎯 Modal props: onConfirm type =', typeof onConfirm, 'onClose type =', typeof onClose)

  // Log when modal actually becomes visible
  React.useEffect(() => {
    if (isOpen && rescheduleData) {
      console.log('🎯 Modal is now open with reschedule data:', rescheduleData)
    }
  }, [isOpen, rescheduleData])

  // Handle keyboard shortcuts
  React.useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      console.log('🎯 KeyDown event in modal:', event.key)

      if (event.key === 'Enter' && !isConfirming) {
        console.log('🎯 Enter key pressed - calling handleConfirm')
        event.preventDefault()
        handleConfirm()
      } else if (event.key === 'Escape' && !isConfirming) {
        console.log('🎯 Escape key pressed - calling handleClose')
        event.preventDefault()
        handleClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, isConfirming])

  if (!rescheduleData) return null

  const { event, fromSlot, toSlot } = rescheduleData

  // Format date and time for display
  const formatDateTime = (date: string, hour: number) => {
    const dateObj = new Date(date + 'T00:00:00')
    dateObj.setHours(hour)
    return {
      date: format(dateObj, 'EEEE, MMMM do, yyyy'),
      time: format(dateObj, 'h:mm a'),
      dateShort: format(dateObj, 'MMM d'),
      timeShort: format(dateObj, 'h:mm a')
    }
  }

  const fromDateTime = formatDateTime(fromSlot.date, fromSlot.hour)
  const toDateTime = formatDateTime(toSlot.date, toSlot.hour)

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

  // Check if this is a significant time change (more than 2 hours or different day)
  const isSignificantChange = () => {
    const timeDiff = Math.abs(toSlot.hour - fromSlot.hour)
    const isDifferentDay = fromSlot.date !== toSlot.date
    return isDifferentDay || timeDiff >= 2
  }

  // Get participants count
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
    console.log('🎯 ========== RESCHEDULE MODAL CONFIRM CLICKED ==========')
    console.log('🎯 RescheduleConfirmationModal: handleConfirm clicked')
    console.log('🎯 Reschedule data:', rescheduleData)
    console.log('🎯 Notify participants:', notifyParticipants)
    console.log('🎯 Reason:', reason)
    console.log('🎯 onConfirm function type:', typeof onConfirm)
    console.log('🎯 onConfirm function:', onConfirm)
    console.log('🎯 Modal is confirming, setting isConfirming to true')

    if (!onConfirm) {
      console.error('🎯 CRITICAL ERROR: onConfirm is null or undefined!')
      setError('onConfirm function is not available')
      return
    }

    if (!rescheduleData) {
      console.error('🎯 CRITICAL ERROR: rescheduleData is null or undefined!')
      setError('Reschedule data is not available')
      return
    }

    setIsConfirming(true)
    setError(null)

    try {
      const dataWithReason = {
        ...rescheduleData,
        reason: reason.trim() || undefined
      }

      console.log('🎯 About to call onConfirm with data:', dataWithReason)
      console.log('🎯 About to call onConfirm with notifyParticipants:', notifyParticipants)

      const result = await onConfirm(dataWithReason, notifyParticipants)
      console.log('🎯 onConfirm completed successfully, result:', result)

      console.log('🎯 Calling onClose()')
      onClose()
      setReason('')
      console.log('🎯 Modal cleanup completed')
    } catch (err) {
      console.error('🎯 onConfirm failed with error:', err)
      console.error('🎯 Error stack:', err instanceof Error ? err.stack : 'No stack trace')
      setError(err instanceof Error ? err.message : 'Failed to reschedule event')
    } finally {
      console.log('🎯 Setting isConfirming to false')
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

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white border-hud-border">
        <DialogHeader className="border-b border-hud-border pb-4">
          <DialogTitle className="flex items-center gap-3 text-xl font-primary font-semibold uppercase tracking-wide text-hud-text-primary">
            <Calendar className="w-6 h-6 text-tactical-gold" />
            Confirm Reschedule
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
                
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{event.duration} minutes</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Time Change Display */}
          <Card className="border-hud-border">
            <CardContent className="p-6">
              <h3 className="font-semibold text-hud-text-primary font-primary uppercase tracking-wide mb-4">
                Schedule Change
              </h3>
              
              <div className="space-y-4">
                {/* From Time */}
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="text-sm text-medium-grey font-primary uppercase tracking-wide mb-1">
                      Current Time
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-red-600" />
                        <div>
                          <div className="font-semibold text-red-800 font-primary">
                            {fromDateTime.date}
                          </div>
                          <div className="text-sm text-red-600 font-primary">
                            {fromDateTime.time}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <ArrowRight className="w-6 h-6 text-tactical-gold flex-shrink-0" />
                  
                  {/* To Time */}
                  <div className="flex-1">
                    <div className="text-sm text-medium-grey font-primary uppercase tracking-wide mb-1">
                      New Time
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-green-600" />
                        <div>
                          <div className="font-semibold text-green-800 font-primary">
                            {toDateTime.date}
                          </div>
                          <div className="text-sm text-green-600 font-primary">
                            {toDateTime.time}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Change Summary */}
                <div className="bg-hud-background-secondary border border-hud-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-tactical-gold" />
                    <span className="font-semibold text-hud-text-primary font-primary uppercase text-sm">
                      Change Summary
                    </span>
                  </div>
                  <div className="text-sm text-medium-grey font-primary">
                    {fromSlot.date !== toSlot.date ? (
                      <span>Moving from {fromDateTime.dateShort} to {toDateTime.dateShort}</span>
                    ) : (
                      <span>Staying on {fromDateTime.dateShort}</span>
                    )}
                    {fromSlot.hour !== toSlot.hour && (
                      <span>
                        {fromSlot.date !== toSlot.date ? ', and ' : 'Moving '}
                        from {fromDateTime.timeShort} to {toDateTime.timeShort}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Significant Change Warning */}
          {isSignificantChange() && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-orange-800 font-primary text-sm">
                      Significant Schedule Change
                    </div>
                    <div className="text-sm text-orange-700 font-primary">
                      This is a major time change. Consider providing a reason for participants.
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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
                  Reason for Reschedule {isSignificantChange() ? '(Recommended)' : '(Optional)'}
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter reason for rescheduling (will be included in notifications)"
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
                console.log('🎯 BUTTON CLICKED! Event:', e)
                console.log('🎯 Button click target:', e.target)
                console.log('🎯 Button click currentTarget:', e.currentTarget)
                console.log('🎯 isConfirming state:', isConfirming)
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
                  {notifyParticipants && hasParticipants ? 'Rescheduling & Notifying...' : 'Rescheduling...'}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Confirm Reschedule
                  {notifyParticipants && hasParticipants && (
                    <>
                      <Send className="w-4 h-4" />
                    </>
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

export default RescheduleConfirmationModal