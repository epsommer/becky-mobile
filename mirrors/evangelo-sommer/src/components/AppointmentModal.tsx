"use client"

import React, { useState, useEffect } from 'react'
import { X, Calendar, Clock, CheckCircle } from 'lucide-react'
import { Client } from '@/types/client'
import { useRouter } from 'next/navigation'
import { lockScroll, unlockScroll } from '@/lib/modal-scroll-lock'

interface AppointmentModalProps {
  isOpen: boolean
  onClose: () => void
  client: Client
}

type AppointmentTimeframe = 'present' | 'future' | 'past'

const AppointmentModal: React.FC<AppointmentModalProps> = ({
  isOpen,
  onClose,
  client
}) => {
  const router = useRouter()
  const [selectedTimeframe, setSelectedTimeframe] = useState<AppointmentTimeframe>('present')
  const [appointmentDate, setAppointmentDate] = useState('')
  const [appointmentTime, setAppointmentTime] = useState('')
  const [notes, setNotes] = useState('')

  // Disable body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      lockScroll()
    } else {
      unlockScroll()
    }

    // Cleanup function to restore scroll on unmount
    return () => {
      unlockScroll()
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Build query parameters for time manager
    const params = new URLSearchParams({
      client: client.id,
      schedule: 'true',
      timeframe: selectedTimeframe
    })

    // Add date/time if provided
    if (appointmentDate) {
      params.append('date', appointmentDate)
    }
    if (appointmentTime) {
      params.append('time', appointmentTime)
    }
    if (notes) {
      params.append('notes', notes)
    }

    // Navigate to time manager with pre-filled data
    router.push(`/time-manager?${params.toString()}`)
    onClose()
  }

  const getTodayDate = () => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }

  const getCurrentTime = () => {
    const now = new Date()
    return now.toTimeString().slice(0, 5)
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-[100]" onClick={onClose} />

      {/* Modal container - accounts for sidebar on desktop */}
      <div className="fixed inset-y-0 right-0 left-0 lg:left-64 z-[101] flex items-start justify-center p-4 sm:p-6 md:p-8 overflow-y-auto pointer-events-none">
        <div className="neo-container max-w-2xl w-full max-h-[calc(100vh-8rem)] sm:max-h-[calc(100vh-12rem)] md:max-h-[calc(100vh-16rem)] mt-16 sm:mt-20 md:mt-16 mb-8 overflow-y-auto pointer-events-auto">
        {/* Header */}
        <div className="neo-inset border-b border-foreground/10 p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Calendar className="h-6 w-6 text-foreground" />
            <h2 className="text-xl font-bold text-foreground uppercase tracking-wide font-primary">
              Schedule Appointment
            </h2>
          </div>
          <button
            onClick={onClose}
            className="neo-button-circle w-8 h-8 flex items-center justify-center transition-transform hover:scale-[1.1]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Client Info */}
          <div className="neo-inset p-4">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 font-primary">
              Scheduling for
            </div>
            <div className="text-lg font-bold text-foreground font-primary">
              {client.name}
            </div>
            {client.company && (
              <div className="text-sm text-muted-foreground font-primary">
                {client.company}
              </div>
            )}
          </div>

          {/* Timeframe Selection */}
          <div>
            <label className="block text-sm font-bold text-foreground mb-3 uppercase tracking-wide font-primary">
              When is this appointment?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Present/Today */}
              <button
                type="button"
                onClick={() => {
                  setSelectedTimeframe('present')
                  setAppointmentDate(getTodayDate())
                  setAppointmentTime(getCurrentTime())
                }}
                className={`neo-button p-4 flex flex-col items-center justify-center space-y-2 transition-all ${
                  selectedTimeframe === 'present'
                    ? 'neo-button-active ring-2 ring-tactical-gold'
                    : 'hover:scale-[1.02]'
                }`}
              >
                <Clock className="h-6 w-6" />
                <div className="text-center">
                  <div className="text-sm font-bold uppercase tracking-wide font-primary">
                    Today
                  </div>
                  <div className="text-xs text-muted-foreground font-primary mt-1">
                    Schedule for today
                  </div>
                </div>
              </button>

              {/* Future */}
              <button
                type="button"
                onClick={() => {
                  setSelectedTimeframe('future')
                  setAppointmentDate('')
                  setAppointmentTime('')
                }}
                className={`neo-button p-4 flex flex-col items-center justify-center space-y-2 transition-all ${
                  selectedTimeframe === 'future'
                    ? 'neo-button-active ring-2 ring-tactical-gold'
                    : 'hover:scale-[1.02]'
                }`}
              >
                <Calendar className="h-6 w-6" />
                <div className="text-center">
                  <div className="text-sm font-bold uppercase tracking-wide font-primary">
                    Upcoming
                  </div>
                  <div className="text-xs text-muted-foreground font-primary mt-1">
                    Future appointment
                  </div>
                </div>
              </button>

              {/* Past */}
              <button
                type="button"
                onClick={() => {
                  setSelectedTimeframe('past')
                  setAppointmentDate('')
                  setAppointmentTime('')
                }}
                className={`neo-button p-4 flex flex-col items-center justify-center space-y-2 transition-all ${
                  selectedTimeframe === 'past'
                    ? 'neo-button-active ring-2 ring-tactical-gold'
                    : 'hover:scale-[1.02]'
                }`}
              >
                <CheckCircle className="h-6 w-6" />
                <div className="text-center">
                  <div className="text-sm font-bold uppercase tracking-wide font-primary">
                    Past Event
                  </div>
                  <div className="text-xs text-muted-foreground font-primary mt-1">
                    Already happened
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Date & Time Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-foreground mb-2 uppercase tracking-wide font-primary">
                Date
              </label>
              <input
                type="date"
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                className="w-full px-3 py-2 neo-inset text-foreground font-primary text-sm"
                required
              />
              {selectedTimeframe === 'present' && (
                <p className="text-xs text-tactical-gold font-primary mt-1">
                  Set to today
                </p>
              )}
              {selectedTimeframe === 'past' && (
                <p className="text-xs text-muted-foreground font-primary mt-1">
                  Select a past date
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-foreground mb-2 uppercase tracking-wide font-primary">
                Time
              </label>
              <input
                type="time"
                value={appointmentTime}
                onChange={(e) => setAppointmentTime(e.target.value)}
                className="w-full px-3 py-2 neo-inset text-foreground font-primary text-sm"
                required
              />
              {selectedTimeframe === 'present' && (
                <p className="text-xs text-tactical-gold font-primary mt-1">
                  Set to current time
                </p>
              )}
            </div>
          </div>

          {/* Notes (Optional) */}
          <div>
            <label className="block text-sm font-bold text-foreground mb-2 uppercase tracking-wide font-primary">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this appointment..."
              rows={4}
              className="w-full px-3 py-2 neo-inset text-foreground font-primary resize-none"
            />
            <p className="text-xs text-muted-foreground font-primary mt-1">
              You can add more details in the time manager
            </p>
          </div>

          {/* Info Box */}
          <div className="neo-inset p-4 border-l-4 border-tactical-gold">
            <div className="flex items-start space-x-2">
              <Calendar className="h-4 w-4 text-tactical-gold mt-0.5 flex-shrink-0" />
              <div className="text-xs text-muted-foreground font-primary">
                {selectedTimeframe === 'present' &&
                  "You'll be taken to the time manager to finalize today's appointment details and add it to the calendar."}
                {selectedTimeframe === 'future' &&
                  "You'll be taken to the time manager to schedule this upcoming appointment and set all the details."}
                {selectedTimeframe === 'past' &&
                  "You'll be taken to the time manager to log this past appointment that wasn't previously recorded."}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-foreground/10">
            <button
              type="button"
              onClick={onClose}
              className="neo-button px-6 py-2 uppercase tracking-wide transition-transform hover:scale-[1.02] font-primary font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="neo-button-active px-6 py-2 uppercase tracking-wide transition-transform hover:scale-[1.02] font-primary font-bold"
            >
              Continue to Calendar
            </button>
          </div>
        </form>
      </div>
    </div>
    </>
  )
}

export default AppointmentModal
