"use client"

import React, { useState } from 'react'
import { format, addDays, startOfWeek, endOfWeek } from 'date-fns'
import { Plus, Calendar, Target, CheckCircle, AlertTriangle, Clock, User, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import EventCreationModal, { UnifiedEvent, EventType, Priority } from '@/components/EventCreationModal'
import { useUnifiedEvents } from '@/hooks/useUnifiedEvents'

const EventCreationDemo: React.FC = () => {
  const [showEventModal, setShowEventModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<UnifiedEvent | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>((() => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), now.getDate()) })())
  const [selectedEventType, setSelectedEventType] = useState<EventType>('event')
  
  const { 
    events, 
    statistics,
    createEvent, 
    updateEvent, 
    deleteEvent,
    getEventsForDate,
    getUpcomingEvents,
    getEventsByType,
    getEventsByPriority,
    searchEvents,
    isLoading,
    error 
  } = useUnifiedEvents({ syncWithLegacy: true })
  
  // Generate week view dates
  const weekStart = startOfWeek(selectedDate)
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  
  const handleCreateEvent = async (eventData: UnifiedEvent) => {
    try {
      await createEvent(eventData)
      setShowEventModal(false)
      setEditingEvent(null)
    } catch (error) {
      console.error('Error creating event:', error)
    }
  }
  
  const handleEditEvent = (event: UnifiedEvent) => {
    setEditingEvent(event)
    setShowEventModal(true)
  }
  
  const handleDeleteEvent = async (eventId: string) => {
    if (confirm('Are you sure you want to delete this event?')) {
      try {
        await deleteEvent(eventId)
      } catch (error) {
        console.error('Error deleting event:', error)
      }
    }
  }
  
  const openModalWithPresets = (type: EventType, date?: Date, time?: string) => {
    setSelectedEventType(type)
    setSelectedDate(date || selectedDate)
    setEditingEvent(null)
    setShowEventModal(true)
  }
  
  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'low': return 'bg-light-grey text-hud-text-primary'
      case 'medium': return 'bg-tactical-gold text-hud-text-primary'
      case 'high': return 'bg-dark-grey text-white'
      case 'urgent': return 'bg-red-600 text-white'
    }
  }
  
  const getEventTypeIcon = (type: EventType) => {
    switch (type) {
      case 'event': return <Calendar className="w-4 h-4" />
      case 'task': return <CheckCircle className="w-4 h-4" />
      case 'goal': return <Target className="w-4 h-4" />
      case 'milestone': return <AlertTriangle className="w-4 h-4" />
    }
  }
  
  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="bg-hud-background-secondary p-6 border-b-2 border-hud-border-accent">
        <h1 className="text-3xl font-bold text-hud-text-primary mb-4 font-primary uppercase tracking-wide">
          Unified Event Creation System
        </h1>
        <p className="text-medium-grey font-primary">
          Create and manage events, tasks, goals, and milestones from one unified interface
        </p>
      </div>
      
      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-primary uppercase tracking-wide">
            Quick Create
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Button
            onClick={() => openModalWithPresets('event')}
            className="flex flex-col items-center gap-2 h-auto p-6 bg-tactical-gold hover:bg-tactical-gold-dark text-white"
          >
            <Calendar className="w-8 h-8" />
            <span className="font-primary text-sm uppercase">
              New Event
            </span>
          </Button>
          
          <Button
            onClick={() => openModalWithPresets('task')}
            className="flex flex-col items-center gap-2 h-auto p-6 bg-green-600 hover:bg-green-700 text-white"
          >
            <CheckCircle className="w-8 h-8" />
            <span className="font-primary text-sm uppercase">
              New Task
            </span>
          </Button>
          
          <Button
            onClick={() => openModalWithPresets('goal')}
            className="flex flex-col items-center gap-2 h-auto p-6 bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Target className="w-8 h-8" />
            <span className="font-primary text-sm uppercase">
              New Goal
            </span>
          </Button>
          
          <Button
            onClick={() => openModalWithPresets('milestone')}
            className="flex flex-col items-center gap-2 h-auto p-6 bg-orange-600 hover:bg-orange-700 text-white"
          >
            <AlertTriangle className="w-8 h-8" />
            <span className="font-primary text-sm uppercase">
              New Milestone
            </span>
          </Button>
        </CardContent>
      </Card>
      
      {/* Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <Card className="text-center">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-hud-text-primary font-primary">
              {statistics.total}
            </div>
            <div className="text-xs uppercase tracking-wide text-medium-grey font-primary">
              Total Events
            </div>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-tactical-gold font-primary">
              {statistics.byType.events}
            </div>
            <div className="text-xs uppercase tracking-wide text-medium-grey font-primary">
              Events
            </div>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600 font-primary">
              {statistics.byType.tasks}
            </div>
            <div className="text-xs uppercase tracking-wide text-medium-grey font-primary">
              Tasks
            </div>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600 font-primary">
              {statistics.byType.goals}
            </div>
            <div className="text-xs uppercase tracking-wide text-medium-grey font-primary">
              Goals
            </div>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600 font-primary">
              {statistics.byType.milestones}
            </div>
            <div className="text-xs uppercase tracking-wide text-medium-grey font-primary">
              Milestones
            </div>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gold font-primary">
              {statistics.today}
            </div>
            <div className="text-xs uppercase tracking-wide text-medium-grey font-primary">
              Today
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Week View */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-primary uppercase tracking-wide">
            Week View - {format(weekStart, 'MMM d')} to {format(endOfWeek(selectedDate), 'MMM d, yyyy')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {weekDates.map(date => {
              const dayEvents = getEventsForDate(date)
              const isToday = format(date, 'yyyy-MM-dd') === format((() => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), now.getDate()) })(), 'yyyy-MM-dd')
              
              return (
                <div key={date.toISOString()} className={`border-2 p-3 min-h-[120px] ${
                  isToday ? 'border-hud-border-accent bg-tactical-gold-light' : 'border-hud-border bg-white'
                }`}>
                  <div className="text-center mb-2">
                    <div className="text-xs font-primary uppercase tracking-wide text-medium-grey">
                      {format(date, 'EEE')}
                    </div>
                    <div className={`text-lg font-bold font-primary ${
                      isToday ? 'text-hud-text-primary' : 'text-medium-grey'
                    }`}>
                      {format(date, 'd')}
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map(event => (
                      <div
                        key={event.id}
                        onClick={() => handleEditEvent(event)}
                        className="text-xs p-1 bg-white border cursor-pointer hover:bg-light-grey transition-colors"
                      >
                        <div className="flex items-center gap-1">
                          {getEventTypeIcon(event.type)}
                          <span className="truncate font-primary">
                            {event.title}
                          </span>
                        </div>
                        {event.duration > 0 && (
                          <div className="text-xs text-medium-grey">
                            {Math.floor(event.duration / 60)}h {event.duration % 60}m
                          </div>
                        )}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-medium-grey text-center py-1 font-primary">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openModalWithPresets('event', date, '09:00')}
                    className="w-full mt-2 text-xs p-1 h-auto opacity-0 hover:opacity-100 transition-opacity"
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
      
      {/* Recent Events */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-primary uppercase tracking-wide">
            All Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-hud-border-accent border-t-transparent mx-auto mb-4"></div>
              <p className="text-medium-grey font-primary">Loading events...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-light-grey" />
              <p className="text-lg font-medium text-medium-grey font-primary uppercase tracking-wide">
                No Events Created
              </p>
              <p className="text-sm text-medium-grey mt-2 font-primary">
                Create your first event using the buttons above
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {events
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map(event => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-4 border border-hud-border hover:bg-hud-background-secondary transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {getEventTypeIcon(event.type)}
                        <Badge className={`text-xs uppercase ${getPriorityColor(event.priority)}`}>
                          {event.priority}
                        </Badge>
                      </div>
                      
                      <div>
                        <div className="font-semibold text-hud-text-primary font-primary">
                          {event.title}
                        </div>
                        <div className="text-sm text-medium-grey font-primary flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(event.startDateTime), 'MMM d, h:mm a')}
                          </span>
                          {event.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {event.location}
                            </span>
                          )}
                          {event.clientName && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {event.clientName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditEvent(event)}
                        className="px-3 text-xs"
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteEvent(event.id)}
                        className="px-3 text-xs"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-600 font-primary">
          Error: {error}
        </div>
      )}
      
      {/* Event Creation Modal */}
      <EventCreationModal
        isOpen={showEventModal}
        onClose={() => {
          setShowEventModal(false)
          setEditingEvent(null)
        }}
        onSave={handleCreateEvent}
        initialDate={selectedDate}
        editingEvent={editingEvent || undefined}
      />
    </div>
  )
}

export default EventCreationDemo