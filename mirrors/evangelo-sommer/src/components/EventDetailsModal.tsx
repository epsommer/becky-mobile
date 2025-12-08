"use client"

import React from 'react'
import { format, parseISO } from 'date-fns'
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Target, 
  FileText, 
  Bell, 
  Repeat, 
  X,
  Edit,
  Trash2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { UnifiedEvent, Priority, EventType } from '@/components/EventCreationModal'

interface EventDetailsModalProps {
  event: UnifiedEvent | null
  isOpen: boolean
  onClose: () => void
  onEdit?: (event: UnifiedEvent) => void
  onDelete?: (eventId: string) => void
}

const EventDetailsModal: React.FC<EventDetailsModalProps> = ({ 
  event, 
  isOpen, 
  onClose, 
  onEdit, 
  onDelete 
}) => {
  if (!event) return null

  const formatDateTime = (dateTime: string) => {
    try {
      return format(parseISO(dateTime), 'EEEE, MMMM do, yyyy \'at\' h:mm a')
    } catch (error) {
      return dateTime
    }
  }

  const formatTime = (dateTime: string) => {
    try {
      return format(parseISO(dateTime), 'h:mm a')
    } catch (error) {
      return dateTime
    }
  }

  const formatDate = (dateTime: string) => {
    try {
      return format(parseISO(dateTime), 'EEEE, MMMM do, yyyy')
    } catch (error) {
      return dateTime
    }
  }

  const getPriorityColor = (priority: Priority): string => {
    switch (priority) {
      case 'urgent': return 'bg-red-600 text-white'
      case 'high': return 'bg-orange-500 text-white'
      case 'medium': return 'bg-yellow-500 text-hud-text-primary'
      case 'low': return 'bg-green-500 text-white'
      default: return 'bg-medium-grey text-white'
    }
  }

  const getEventTypeColor = (type: EventType): string => {
    switch (type) {
      case 'event': return 'bg-tactical-gold-muted0 text-white'
      case 'task': return 'bg-purple-500 text-white'
      case 'goal': return 'bg-green-600 text-white'
      case 'milestone': return 'bg-tactical-gold text-hud-text-primary'
      default: return 'bg-medium-grey text-white'
    }
  }

  const getDurationText = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} minutes`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    if (remainingMinutes === 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`
    }
    return `${hours}h ${remainingMinutes}m`
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-hud-background-secondary border-2 border-hud-border-accent">
        <DialogHeader className="border-b border-hud-border-accent pb-4">
          <DialogTitle className="text-2xl font-bold font-primary text-hud-text-primary uppercase tracking-wide">
            Event Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-6">
          {/* Title and Type */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-bold font-primary text-hud-text-primary">
                {event.title}
              </h2>
              <Badge className={getEventTypeColor(event.type)}>
                {event.type.toUpperCase()}
              </Badge>
              <Badge className={getPriorityColor(event.priority)}>
                {event.priority.toUpperCase()} PRIORITY
              </Badge>
            </div>
            
            {event.description && (
              <p className="text-medium-grey font-primary">
                {event.description}
              </p>
            )}
          </div>

          {/* Date and Time Information */}
          <Card className="border-hud-border-accent">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-hud-text-primary font-primary">
                <Calendar className="h-5 w-5 mr-2" />
                Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {event.isAllDay ? (
                <div className="flex items-center text-medium-grey">
                  <Clock className="h-4 w-4 mr-2" />
                  <span>All day on {formatDate(event.startDateTime)}</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center text-medium-grey">
                    <Clock className="h-4 w-4 mr-2" />
                    <span>Start: {formatDateTime(event.startDateTime)}</span>
                  </div>
                  {event.endDateTime && (
                    <div className="flex items-center text-medium-grey">
                      <Clock className="h-4 w-4 mr-2" />
                      <span>End: {formatDateTime(event.endDateTime)}</span>
                    </div>
                  )}
                  <div className="flex items-center text-medium-grey">
                    <Target className="h-4 w-4 mr-2" />
                    <span>Duration: {getDurationText(event.duration)}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Location */}
          {event.location && (
            <Card className="border-hud-border-accent">
              <CardContent className="pt-6">
                <div className="flex items-center text-medium-grey">
                  <MapPin className="h-5 w-5 mr-3" />
                  <div>
                    <span className="font-semibold text-hud-text-primary">Location</span>
                    <p className="text-sm">{event.location}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Client Information */}
          {(event.clientId || event.clientName) && (
            <Card className="border-hud-border-accent">
              <CardContent className="pt-6">
                <div className="flex items-center text-medium-grey">
                  <User className="h-5 w-5 mr-3" />
                  <div>
                    <span className="font-semibold text-hud-text-primary">Client</span>
                    <p className="text-sm">{event.clientName || `Client ID: ${event.clientId}`}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {event.notes && (
            <Card className="border-hud-border-accent">
              <CardContent className="pt-6">
                <div className="flex items-start text-medium-grey">
                  <FileText className="h-5 w-5 mr-3 mt-0.5" />
                  <div>
                    <span className="font-semibold text-hud-text-primary">Notes</span>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{event.notes}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notifications */}
          {event.notifications && event.notifications.length > 0 && (
            <Card className="border-hud-border-accent">
              <CardContent className="pt-6">
                <div className="flex items-start text-medium-grey">
                  <Bell className="h-5 w-5 mr-3 mt-0.5" />
                  <div>
                    <span className="font-semibold text-hud-text-primary">Notifications</span>
                    <div className="space-y-1 mt-1">
                      {event.notifications && Array.isArray(event.notifications) ? (
                        event.notifications.map((notification) => (
                          <p key={notification.id} className="text-sm">
                            {notification.enabled ? '🔔' : '🔕'} {notification.value} {notification.trigger} before
                          </p>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No notifications set</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recurring Information */}
          {event.isRecurring && event.recurrence && (
            <Card className="border-hud-border-accent">
              <CardContent className="pt-6">
                <div className="flex items-start text-medium-grey">
                  <Repeat className="h-5 w-5 mr-3 mt-0.5" />
                  <div>
                    <span className="font-semibold text-hud-text-primary">Recurring Event</span>
                    <p className="text-sm mt-1">
                      Repeats every {event.recurrence.interval} {event.recurrence.intervalType || event.recurrence.frequency}
                      {event.recurrence.endDate && ` until ${formatDate(event.recurrence.endDate)}`}
                      {event.recurrence.occurrences && ` for ${event.recurrence.occurrences} occurrences`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-hud-border-accent">
            {onEdit && (
              <Button
                variant="outline"
                onClick={() => onEdit(event)}
                className="border-hud-border-accent text-gold hover:bg-tactical-gold hover:text-hud-text-primary px-4 py-2"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Event
              </Button>
            )}
            {onDelete && (
              <Button
                variant="outline"
                onClick={() => onDelete(event.id)}
                className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white px-4 py-2"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Event
              </Button>
            )}
            <Button
              onClick={onClose}
              className="bg-tactical-gold text-hud-text-primary hover:bg-yellow-500 px-6 py-2"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default EventDetailsModal