"use client"

import React, { useState, useEffect } from 'react'
import { format, startOfWeek, endOfWeek, addDays, isSameDay, isToday, startOfDay, endOfDay } from 'date-fns'
import { Clock, MapPin, User, Calendar, Filter, Search, Plus, Target, Briefcase, Home } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useViewManager } from '@/contexts/ViewManagerContext'
import { useUnifiedEvents } from '@/hooks/useUnifiedEvents'
import { DailyTask } from '@/types/daily-planner'
import { UnifiedEvent } from '@/components/EventCreationModal'
import { EventCategorizer, EventCategory, eventCategorizer } from '@/lib/event-categorizer'

interface ScheduledService {
  id: string
  title: string
  service: string
  clientName: string
  scheduledDate: string
  notes?: string
  priority: string
  status: string
  duration: number
  location?: string
}

interface AgendaItem {
  id: string
  title: string
  type: 'service' | 'task'
  date: Date
  startTime: string
  duration: number
  priority: string
  status: string
  clientName?: string
  location?: string
  notes?: string
  service?: string
  category?: EventCategory
  confidence?: number
  matchedKeywords?: string[]
}

interface AgendaViewProps {
  onItemClick?: (item: AgendaItem) => void
  onEventView?: (event: UnifiedEvent) => void
  onAddEvent?: () => void
  viewRange?: 'day' | 'week' | 'month'
  refreshTrigger?: number
}

const AgendaView: React.FC<AgendaViewProps> = ({ 
  onItemClick, 
  onEventView, 
  onAddEvent, 
  viewRange = 'week', 
  refreshTrigger 
}) => {
  const { state } = useViewManager()
  const { selectedDate } = state
  const [scheduledServices, setScheduledServices] = useState<ScheduledService[]>([])
  const [tasks, setTasks] = useState<DailyTask[]>([])
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'high-priority' | 'primary' | 'secondary' | 'tertiary'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [categorizer, setCategorizer] = useState<EventCategorizer>(eventCategorizer.instance)
  
  // Use unified events hook
  const { events: unifiedEvents, getEventsForDate } = useUnifiedEvents({ syncWithLegacy: true, refreshTrigger })

  useEffect(() => {
    try {
      const services = JSON.parse(localStorage.getItem('scheduled-services') || '[]')
      setScheduledServices(services)

      const dailyTasks = JSON.parse(localStorage.getItem('daily-tasks') || '[]')
      setTasks(dailyTasks)
      
      // Update categorizer with latest preferences
      const config = EventCategorizer.loadConfigFromPreferences()
      setCategorizer(new EventCategorizer(config))
    } catch (error) {
      console.error('Error loading agenda data:', error)
    }
  }, [refreshTrigger])

  // Convert services and tasks to unified agenda items
  const getAgendaItems = (): AgendaItem[] => {
    let items: AgendaItem[] = []

    // Get date range based on view
    let startDate: Date, endDate: Date
    
    switch (viewRange) {
      case 'day':
        startDate = startOfDay(selectedDate)
        endDate = endOfDay(selectedDate)
        break
      case 'week':
        startDate = startOfWeek(selectedDate, { weekStartsOn: 0 })
        endDate = endOfWeek(selectedDate, { weekStartsOn: 0 })
        break
      case 'month':
        startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
        endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)
        break
    }

    // Add scheduled services
    scheduledServices
      .filter(service => {
        const serviceDate = new Date(service.scheduledDate)
        return serviceDate >= startDate && serviceDate <= endDate
      })
      .forEach(service => {
        const baseItem = {
          id: service.id,
          title: service.title || service.service,
          type: 'service' as const,
          date: new Date(service.scheduledDate),
          startTime: format(new Date(service.scheduledDate), 'HH:mm'),
          duration: service.duration || 60,
          priority: service.priority,
          status: service.status,
          clientName: service.clientName,
          location: `${service.clientName}'s Property`,
          notes: service.notes,
          service: service.service
        }
        
        // Categorize the service
        const categorization = categorizer.categorizeEvent({
          title: baseItem.title,
          description: baseItem.notes,
          service: baseItem.service,
          clientName: baseItem.clientName,
          location: baseItem.location,
          type: 'service'
        })
        
        items.push({
          ...baseItem,
          category: categorization.category,
          confidence: categorization.confidence,
          matchedKeywords: categorization.matchedKeywords
        })
      })

    // Add tasks
    tasks
      .filter(task => {
        if (!task.startTime) return false;
        const taskDate = new Date(task.startTime)
        return taskDate >= startDate && taskDate <= endDate
      })
      .forEach(task => {
        const baseItem = {
          id: task.id,
          title: task.title,
          type: 'task' as const,
          date: new Date(task.startTime),
          startTime: format(new Date(task.startTime), 'HH:mm'),
          duration: task.estimatedDuration || 60,
          priority: task.priority,
          status: task.status,
          location: task.location,
          notes: task.notes
        }
        
        // Categorize the task
        const categorization = categorizer.categorizeEvent({
          title: baseItem.title,
          description: baseItem.notes,
          location: baseItem.location,
          type: 'task'
        })
        
        items.push({
          ...baseItem,
          category: categorization.category,
          confidence: categorization.confidence,
          matchedKeywords: categorization.matchedKeywords
        })
      })

    // Add unified events
    unifiedEvents
      .filter(event => {
        const eventDate = new Date(event.startDateTime)
        return eventDate >= startDate && eventDate <= endDate
      })
      .forEach(event => {
        const baseItem = {
          id: event.id,
          title: event.title,
          type: event.type as any,
          date: new Date(event.startDateTime),
          startTime: format(new Date(event.startDateTime), 'HH:mm'),
          duration: event.duration || 60,
          priority: event.priority || 'medium',
          status: event.status || 'pending',
          clientName: event.clientId,
          location: event.location,
          notes: event.notes || event.description,
          service: undefined
        }
        
        // Categorize the unified event
        const categorization = categorizer.categorizeEvent({
          title: baseItem.title,
          description: baseItem.notes,
          service: baseItem.service,
          clientName: baseItem.clientName,
          location: baseItem.location,
          type: event.type
        })
        
        items.push({
          ...baseItem,
          category: categorization.category,
          confidence: categorization.confidence,
          matchedKeywords: categorization.matchedKeywords
        })
      })

    // Apply filters
    if (filter !== 'all') {
      items = items.filter(item => {
        switch (filter) {
          case 'pending':
            return item.status !== 'completed' && item.status !== 'cancelled'
          case 'completed':
            return item.status === 'completed'
          case 'high-priority':
            return item.priority === 'high' || item.priority === 'urgent'
          case 'primary':
            return item.category === 'primary'
          case 'secondary':
            return item.category === 'secondary'
          case 'tertiary':
            return item.category === 'tertiary'
          default:
            return true
        }
      })
    }
    
    // Sort by category priority if enabled
    // items = categorizer.sortEventsByPriority(items) as AgendaItem[]

    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      items = items.filter(item => 
        item.title.toLowerCase().includes(term) ||
        item.clientName?.toLowerCase().includes(term) ||
        item.service?.toLowerCase().includes(term) ||
        item.notes?.toLowerCase().includes(term)
      )
    }

    // Sort by date and time
    return items.sort((a, b) => {
      const dateCompare = a.date.getTime() - b.date.getTime()
      if (dateCompare !== 0) return dateCompare
      return a.startTime.localeCompare(b.startTime)
    })
  }

  const agendaItems = getAgendaItems()

  // Group items by date
  const groupedItems = agendaItems.reduce((groups, item) => {
    const dateKey = format(item.date, 'yyyy-MM-dd')
    if (!groups[dateKey]) {
      groups[dateKey] = []
    }
    groups[dateKey].push(item)
    return groups
  }, {} as Record<string, AgendaItem[]>)

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high':
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-tactical-gold-muted text-tactical-brown-dark border-tactical-grey-300'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-600'
      case 'in_progress':
      case 'in-progress':
        return 'bg-tactical-gold'
      case 'cancelled':
        return 'bg-red-600'
      default:
        return 'bg-medium-grey'
    }
  }

  const getTypeIcon = (type: string) => {
    return type === 'service' ? Calendar : Clock
  }

  const getCategoryInfo = (category: EventCategory) => {
    return categorizer.getCategoryInfo(category)
  }

  const getCategoryIcon = (category: EventCategory) => {
    switch (category) {
      case 'primary':
        return Target
      case 'secondary':
        return Briefcase
      case 'tertiary':
        return Home
      default:
        return Briefcase
    }
  }

  // Convert agenda item to unified event for detail viewing
  const convertToUnifiedEvent = (item: AgendaItem): UnifiedEvent => {
    const startDateTime = new Date(item.date)
    startDateTime.setHours(parseInt(item.startTime.split(':')[0]))
    startDateTime.setMinutes(parseInt(item.startTime.split(':')[1]))

    const endDateTime = new Date(startDateTime)
    endDateTime.setMinutes(endDateTime.getMinutes() + item.duration)

    return {
      id: item.id,
      type: 'task' as any,
      title: item.title,
      description: item.notes,
      startDateTime: startDateTime.toISOString(),
      endDateTime: endDateTime.toISOString(),
      duration: item.duration,
      priority: item.priority as any,
      clientId: item.clientName,
      location: item.location,
      notes: item.notes,
      status: item.status as any,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }

  const handleItemClick = (item: AgendaItem) => {
    const unifiedEvent = convertToUnifiedEvent(item)
    onEventView?.(unifiedEvent)
    onItemClick?.(item)
  }

  return (
    <div className="space-y-6">
      {/* Agenda Header */}
      <div className="neo-card">
        <div className="bg-card border-b border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <Target className="h-6 w-6 text-accent" />
                <h2 className="text-2xl font-bold text-foreground uppercase tracking-wide font-primary">
                  Mission Objectives
                </h2>
              </div>
              <div className="text-muted-foreground font-primary uppercase tracking-wider text-sm">
                <div className="flex items-center space-x-4 mb-1">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span>Primary: Money-Making</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span>Secondary: Business Support</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-tactical-gold-muted"></div>
                    <span>Tertiary: Personal Life</span>
                  </div>
                </div>
                <div>
                  {viewRange === 'day' ? format(selectedDate, 'EEEE, MMMM do, yyyy') :
                   viewRange === 'week' ? `${format(startOfWeek(selectedDate), 'MMM d')} - ${format(endOfWeek(selectedDate), 'MMM d, yyyy')}` :
                   format(selectedDate, 'MMMM yyyy')}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search agenda..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="neomorphic-input pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-accent text-sm font-primary"
                />
              </div>

              {/* Filter */}
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                  className="neomorphic-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent font-primary"
                >
                  <option value="all">All Items</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="high-priority">High Priority</option>
                  <option value="primary">Primary Objectives</option>
                  <option value="secondary">Secondary Objectives</option>
                  <option value="tertiary">Tertiary Objectives</option>
                </select>
              </div>

              {/* Stats */}
              <div className="text-center">
                <div className="text-2xl font-bold text-accent font-primary uppercase">
                  {agendaItems.length}
                </div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-primary">
                  Items
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Agenda Items */}
      <div className="space-y-6">
        {Object.keys(groupedItems).length === 0 ? (
          <div className="neo-card">
            <div className="p-12 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
              <p className="text-lg font-bold uppercase tracking-wide text-muted-foreground font-primary">
                No Items Found
              </p>
              <p className="text-sm mt-2 text-muted-foreground font-primary">
                {filter !== 'all' || searchTerm ? 'Try adjusting your filters or search term' : 'No events scheduled for this period'}
              </p>
            </div>
          </div>
        ) : (
          Object.entries(groupedItems).map(([dateKey, items]) => {
            const date = new Date(dateKey)
            const isCurrentDay = isToday(date)

            return (
              <div key={dateKey} className={`neo-card ${isCurrentDay ? 'ring-2 ring-accent' : ''}`}>
                <div className={`${isCurrentDay ? 'bg-accent/10' : 'bg-card'} border-b border-border p-4`}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-foreground uppercase tracking-wide font-primary">
                      {format(date, 'EEEE, MMMM do')}
                      {isCurrentDay && (
                        <Badge className="ml-3 bg-accent text-accent-foreground font-primary">TODAY</Badge>
                      )}
                    </h3>
                    <div className="flex items-center space-x-4">
                      {/* Quick Add Event for this day */}
                      {onAddEvent && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            onAddEvent()
                          }}
                          className="neo-button-active text-xs font-primary uppercase tracking-wide"
                          title="Add event for this day"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Event
                        </Button>
                      )}
                      <Badge variant="outline" className="bg-card text-foreground border-border font-primary">
                        {items.length} items
                      </Badge>
                      <Badge variant="outline" className="bg-card text-foreground border-border font-primary">
                        {Math.round(items.reduce((sum, item) => sum + item.duration, 0) / 60 * 10) / 10}h total
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="p-0">
                  <div className="divide-y divide-border">
                    {items.map((item, index) => {
                      const TypeIcon = getTypeIcon(item.type)

                      return (
                        <div
                          key={item.id}
                          className="p-4 hover:bg-card/80 transition-colors cursor-pointer border-l-4 border-l-transparent hover:border-l-accent"
                          onClick={() => handleItemClick(item)}
                        >
                          <div className="flex items-start space-x-4">
                            {/* Time */}
                            <div className="text-center min-w-[60px]">
                              <div className="text-sm font-medium text-foreground font-primary">
                                {item.startTime}
                              </div>
                              <div className="text-xs text-muted-foreground font-primary">
                                {item.duration}min
                              </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-3 mb-2">
                                    <TypeIcon className="h-4 w-4 text-accent" />
                                    {item.category && (() => {
                                      const CategoryIcon = getCategoryIcon(item.category)
                                      return <CategoryIcon className="h-4 w-4 text-accent" />
                                    })()}
                                    <h4 className="text-base font-bold text-foreground uppercase font-primary">
                                      {item.title}
                                    </h4>
                                    {item.category && (
                                      <Badge className={`px-2 py-1 text-xs font-primary uppercase ${getCategoryInfo(item.category).badgeClass}`}>
                                        {getCategoryInfo(item.category).label}
                                      </Badge>
                                    )}
                                    <Badge className={`px-2 py-1 text-xs font-primary uppercase ${getPriorityColor(item.priority)}`}>
                                      {item.priority?.toUpperCase() || 'MEDIUM'}
                                    </Badge>
                                    {item.type === 'service' && (
                                      <Badge variant="outline" className="text-xs text-muted-foreground uppercase font-primary border-border">
                                        {item.service?.replace('_', ' ')}
                                      </Badge>
                                    )}
                                    {item.confidence && item.confidence > 0.7 && item.matchedKeywords && item.matchedKeywords.length > 0 && (
                                      <Badge variant="outline" className="text-xs text-accent border-accent font-primary" title={`Matched: ${item.matchedKeywords.join(', ')}`}>
                                        AI: {Math.round(item.confidence * 100)}%
                                      </Badge>
                                    )}
                                  </div>

                                  <div className="flex items-center space-x-4 text-sm text-muted-foreground font-primary mb-2">
                                    {item.clientName && (
                                      <span className="flex items-center">
                                        <User className="h-3 w-3 mr-1" />
                                        {item.clientName}
                                      </span>
                                    )}
                                    {item.location && (
                                      <span className="flex items-center">
                                        <MapPin className="h-3 w-3 mr-1" />
                                        {item.location}
                                      </span>
                                    )}
                                  </div>

                                  {item.notes && (
                                    <p className="text-sm text-muted-foreground font-primary mt-2">
                                      {item.notes}
                                    </p>
                                  )}
                                </div>

                                <div className="flex items-center space-x-2 ml-4">
                                  <div
                                    className={`w-3 h-3 rounded-full ${getStatusColor(item.status)}`}
                                    title={item.status}
                                  />
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="neo-button-active px-3 py-1 text-xs font-primary uppercase tracking-wide"
                                  >
                                    View
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default AgendaView