"use client"

import React, { useState } from 'react'
import { format, addHours } from 'date-fns'
import { Calendar, Clock, CheckCircle, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { UnifiedEvent, Priority } from '@/components/EventCreationModal'
import { DragDropProvider } from '@/components/DragDropContext'
import DragAndDropEvent from '@/components/DragAndDropEvent'
import DropZone from '@/components/DropZone'
import RescheduleConfirmationModal from '@/components/RescheduleConfirmationModal'
import DragVisualFeedback from '@/components/DragVisualFeedback'

interface DragDropCalendarDemoProps {
  onClose?: () => void
}

interface RescheduleData {
  event: UnifiedEvent
  fromSlot: { date: string; hour: number }
  toSlot: { date: string; hour: number }
  reason?: string
}

const DragDropCalendarDemo: React.FC<DragDropCalendarDemoProps> = ({ onClose }) => {
  // Sample events for demonstration
  const [events, setEvents] = useState<UnifiedEvent[]>([
    {
      id: 'demo-1',
      type: 'event',
      title: 'Client Meeting - Johnson Project',
      description: 'Discuss project requirements and timeline',
      startDateTime: '2024-01-15T09:00:00',
      endDateTime: '2024-01-15T10:00:00',
      duration: 60,
      priority: 'high',
      clientName: 'Johnson Construction',
      location: '123 Main St',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'demo-2',
      type: 'task',
      title: 'Site Inspection - Wilson Property',
      description: 'Complete safety inspection checklist',
      startDateTime: '2024-01-15T11:30:00',
      endDateTime: '2024-01-15T12:30:00',
      duration: 60,
      priority: 'medium',
      clientName: 'Wilson Properties',
      location: '456 Oak Ave',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'demo-3',
      type: 'event',
      title: 'Team Lunch',
      description: 'Monthly team building lunch',
      startDateTime: '2024-01-15T13:00:00',
      endDateTime: '2024-01-15T14:00:00',
      duration: 60,
      priority: 'low',
      location: 'Downtown Bistro',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ])

  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [rescheduleData, setRescheduleData] = useState<RescheduleData | null>(null)
  const [demoStats, setDemoStats] = useState({
    totalDrags: 0,
    successfulReschedules: 0,
    touchInteractions: 0
  })

  // Get today's date for demo
  const demoDate = '2024-01-15'

  // Create time slots for demo (8 AM to 6 PM)
  const timeSlots = Array.from({ length: 10 }, (_, i) => i + 8)

  // Get events for a specific hour
  const getEventsForHour = (hour: number): UnifiedEvent[] => {
    return events.filter(event => {
      const eventDate = new Date(event.startDateTime)
      return eventDate.getHours() === hour
    })
  }

  // Handle drag and drop
  const handleEventDrop = (event: UnifiedEvent, fromSlot: { date: string; hour: number }, toSlot: { date: string; hour: number }) => {
    setDemoStats(prev => ({ ...prev, totalDrags: prev.totalDrags + 1 }))
    
    const rescheduleInfo: RescheduleData = {
      event,
      fromSlot,
      toSlot
    }
    setRescheduleData(rescheduleInfo)
    setShowRescheduleModal(true)
  }

  // Handle event resize
  const handleEventResize = (event: UnifiedEvent, newStartTime: string, newEndTime: string) => {
    setEvents(prev => prev.map(e => 
      e.id === event.id 
        ? {
            ...e,
            startDateTime: newStartTime,
            endDateTime: newEndTime,
            duration: Math.round((new Date(newEndTime).getTime() - new Date(newStartTime).getTime()) / (1000 * 60))
          }
        : e
    ))
  }

  // Confirm reschedule
  const handleRescheduleConfirm = async (data: RescheduleData, notifyParticipants: boolean) => {
    try {
      // Calculate new times
      const newDate = new Date(data.toSlot.date + 'T00:00:00')
      newDate.setHours(data.toSlot.hour)
      
      const originalStart = new Date(data.event.startDateTime)
      newDate.setMinutes(originalStart.getMinutes())
      
      const newStart = newDate.toISOString().slice(0, 19)
      const newEnd = new Date(newDate.getTime() + data.event.duration * 60000).toISOString().slice(0, 19)
      
      // Update the event
      setEvents(prev => prev.map(e => 
        e.id === data.event.id 
          ? {
              ...e,
              startDateTime: newStart,
              endDateTime: newEnd,
              notes: data.reason ? `${e.notes || ''}\n\nRescheduled: ${data.reason}`.trim() : e.notes
            }
          : e
      ))
      
      setDemoStats(prev => ({ ...prev, successfulReschedules: prev.successfulReschedules + 1 }))
      
    } catch (error) {
      console.error('Error rescheduling event:', error)
      throw error
    }
  }

  const formatTimeSlot = (hour: number) => {
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    const period = hour < 12 ? 'AM' : 'PM'
    return `${displayHour}:00 ${period}`
  }

  return (
    <DragDropProvider onEventDrop={handleEventDrop} onEventResize={handleEventResize}>
      <div className="space-y-6">
        {/* Demo Header */}
        <Card className="border-tactical-gold bg-tactical-gold-light">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="w-6 h-6 text-tactical-gold" />
                <span className="text-xl font-primary font-semibold uppercase tracking-wide">
                  Drag & Drop Calendar Demo
                </span>
              </div>
              {onClose && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={onClose}
                  className="uppercase tracking-wide font-primary"
                >
                  Close Demo
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white bg-opacity-50 rounded-lg p-4">
              <div className="flex items-start gap-3 mb-3">
                <Info className="w-5 h-5 text-tactical-gold mt-0.5" />
                <div>
                  <h3 className="font-semibold text-hud-text-primary font-primary uppercase text-sm mb-2">
                    How to Use
                  </h3>
                  <ul className="text-sm text-medium-grey font-primary space-y-1">
                    <li>• <strong>Desktop:</strong> Click and drag events to reschedule</li>
                    <li>• <strong>Mobile:</strong> Long press and drag events</li>
                    <li>• <strong>Resize:</strong> Drag the top/bottom edges to change duration</li>
                    <li>• <strong>Drop Zones:</strong> Highlighted areas show valid drop targets</li>
                  </ul>
                </div>
              </div>
            </div>
            
            {/* Demo Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-tactical-gold font-primary">
                  {demoStats.totalDrags}
                </div>
                <div className="text-xs uppercase tracking-wider text-medium-grey font-primary">
                  Total Drags
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 font-primary">
                  {demoStats.successfulReschedules}
                </div>
                <div className="text-xs uppercase tracking-wider text-medium-grey font-primary">
                  Reschedules
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-hud-text-primary font-primary">
                  {events.length}
                </div>
                <div className="text-xs uppercase tracking-wider text-medium-grey font-primary">
                  Events
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calendar Demo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 font-primary uppercase tracking-wide">
              <Clock className="w-5 h-5 text-tactical-gold" />
              Monday, January 15th, 2024
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-0">
              {timeSlots.map(hour => {
                const hourEvents = getEventsForHour(hour)
                const isCurrentHour = new Date().getHours() === hour
                
                return (
                  <div 
                    key={hour}
                    className={`grid grid-cols-12 gap-0 border-b min-h-[80px] ${
                      isCurrentHour ? 'bg-tactical-gold-light/20 border-l-4 border-hud-border-accent' : ''
                    }`}
                  >
                    {/* Time Label */}
                    <div className={`col-span-2 p-4 border-r flex items-center justify-center ${
                      isCurrentHour ? 'bg-tactical-gold text-hud-text-primary' : 'bg-light-grey'
                    }`}>
                      <div className="text-center">
                        <div className={`text-sm font-bold font-primary ${
                          isCurrentHour ? 'text-hud-text-primary' : 'text-medium-grey'
                        }`}>
                          {formatTimeSlot(hour)}
                        </div>
                        {isCurrentHour && (
                          <div className="text-xs font-primary text-hud-text-primary">
                            NOW
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Events Column */}
                    <div className="col-span-10">
                      <DropZone 
                        date={demoDate}
                        hour={hour}
                        isOccupied={hourEvents.length > 0}
                        events={hourEvents}
                        className="min-h-[80px] p-3"
                        showAlways={false}
                      >
                        {hourEvents.length > 0 ? (
                          <div className="space-y-2">
                            {hourEvents.map(event => (
                              <DragAndDropEvent
                                key={event.id}
                                event={event}
                                currentDate={demoDate}
                                currentHour={hour}
                                onClick={(e) => console.log('Clicked event:', e.title)}
                                showResizeHandles={true}
                                className="mb-2"
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="h-full flex items-center justify-center opacity-0 hover:opacity-100 transition-all">
                            <div className="text-xs text-medium-grey font-primary text-center">
                              <div className="font-semibold">Drop events here</div>
                              <div className="text-xs mt-1">{formatTimeSlot(hour)}</div>
                            </div>
                          </div>
                        )}
                      </DropZone>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Event List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 font-primary uppercase tracking-wide">
              <CheckCircle className="w-5 h-5 text-tactical-gold" />
              All Events
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {events.map(event => {
              const startTime = new Date(event.startDateTime)
              return (
                <div key={event.id} className="flex items-center justify-between p-3 bg-hud-background-secondary rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge className={`
                      ${event.priority === 'high' ? 'bg-red-100 text-red-800' : ''}
                      ${event.priority === 'medium' ? 'bg-tactical-gold-light text-hud-text-primary' : ''}
                      ${event.priority === 'low' ? 'bg-green-100 text-green-800' : ''}
                      font-semibold uppercase text-xs
                    `}>
                      {event.priority}
                    </Badge>
                    <div>
                      <div className="font-semibold text-hud-text-primary font-primary">
                        {event.title}
                      </div>
                      <div className="text-sm text-medium-grey font-primary">
                        {format(startTime, 'h:mm a')} • {event.duration} mins
                        {event.location && ` • ${event.location}`}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-medium-grey font-primary uppercase tracking-wide">
                      {event.type}
                    </div>
                    {event.clientName && (
                      <div className="text-xs text-medium-grey font-primary">
                        {event.clientName}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      {/* Drag Visual Feedback */}
      <DragVisualFeedback />
      
      {/* Reschedule Confirmation Modal */}
      <RescheduleConfirmationModal
        isOpen={showRescheduleModal}
        onClose={() => {
          setShowRescheduleModal(false)
          setRescheduleData(null)
        }}
        onConfirm={handleRescheduleConfirm}
        rescheduleData={rescheduleData}
      />
    </DragDropProvider>
  )
}

export default DragDropCalendarDemo