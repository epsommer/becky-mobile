// src/components/goals/GoalTimeline.tsx
// Timeline visualization for goals and milestones

"use client"

import React, { useState, useMemo } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isWithinInterval } from 'date-fns'
import { ChevronLeft, ChevronRight, Target, CheckCircle, Clock, AlertTriangle, Diamond } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Goal, Milestone, GoalStatus, Priority, PRIORITY_COLORS, STATUS_COLORS } from '@/types/goals'
import { cn } from '@/lib/utils'

interface GoalTimelineProps {
  goals: Goal[]
  milestones: Milestone[]
  viewType?: 'month' | 'quarter' | 'year'
  selectedDate?: Date
  onGoalClick?: (goal: Goal) => void
  onMilestoneClick?: (milestone: Milestone) => void
  onDateChange?: (date: Date) => void
  className?: string
}

interface TimelineItem {
  id: string
  type: 'goal' | 'milestone'
  title: string
  date: Date
  endDate?: Date
  status: GoalStatus
  priority: Priority
  progress?: number
  color?: string
  data: Goal | Milestone
}

const GoalTimeline: React.FC<GoalTimelineProps> = ({
  goals = [],
  milestones = [],
  viewType = 'month',
  selectedDate = new Date(),
  onGoalClick,
  onMilestoneClick,
  onDateChange,
  className
}) => {
  const [currentDate, setCurrentDate] = useState(selectedDate)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  // Generate timeline items
  const timelineItems = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = []
    
    // Add goals
    goals.forEach(goal => {
      items.push({
        id: goal.id,
        type: 'goal',
        title: goal.title,
        date: new Date(goal.startDate),
        endDate: new Date(goal.endDate),
        status: goal.status,
        priority: goal.priority,
        progress: goal.progress,
        color: goal.color || PRIORITY_COLORS[goal.priority],
        data: goal
      })
    })
    
    // Add milestones
    milestones.forEach(milestone => {
      items.push({
        id: milestone.id,
        type: 'milestone',
        title: milestone.title,
        date: new Date(milestone.dueDate),
        status: milestone.status,
        priority: milestone.priority,
        progress: milestone.progress,
        color: milestone.color || PRIORITY_COLORS[milestone.priority],
        data: milestone
      })
    })
    
    return items.sort((a, b) => a.date.getTime() - b.date.getTime())
  }, [goals, milestones])

  // Get visible date range based on view type
  const dateRange = useMemo(() => {
    switch (viewType) {
      case 'month':
        return {
          start: startOfMonth(currentDate),
          end: endOfMonth(currentDate)
        }
      case 'quarter':
        const quarter = Math.floor(currentDate.getMonth() / 3)
        const quarterStart = new Date(currentDate.getFullYear(), quarter * 3, 1)
        const quarterEnd = new Date(currentDate.getFullYear(), quarter * 3 + 3, 0)
        return { start: quarterStart, end: quarterEnd }
      case 'year':
        return {
          start: new Date(currentDate.getFullYear(), 0, 1),
          end: new Date(currentDate.getFullYear(), 11, 31)
        }
      default:
        return {
          start: startOfMonth(currentDate),
          end: endOfMonth(currentDate)
        }
    }
  }, [currentDate, viewType])

  // Filter items within the visible range
  const visibleItems = useMemo(() => {
    return timelineItems.filter(item => 
      isWithinInterval(item.date, dateRange) ||
      (item.endDate && isWithinInterval(item.endDate, dateRange)) ||
      (item.endDate && item.date <= dateRange.start && item.endDate >= dateRange.end)
    )
  }, [timelineItems, dateRange])

  // Generate calendar days
  const calendarDays = useMemo(() => {
    return eachDayOfInterval(dateRange)
  }, [dateRange])

  // Navigation functions
  const navigatePrevious = () => {
    const newDate = new Date(currentDate)
    switch (viewType) {
      case 'month':
        newDate.setMonth(newDate.getMonth() - 1)
        break
      case 'quarter':
        newDate.setMonth(newDate.getMonth() - 3)
        break
      case 'year':
        newDate.setFullYear(newDate.getFullYear() - 1)
        break
    }
    setCurrentDate(newDate)
    onDateChange?.(newDate)
  }

  const navigateNext = () => {
    const newDate = new Date(currentDate)
    switch (viewType) {
      case 'month':
        newDate.setMonth(newDate.getMonth() + 1)
        break
      case 'quarter':
        newDate.setMonth(newDate.getMonth() + 3)
        break
      case 'year':
        newDate.setFullYear(newDate.getFullYear() + 1)
        break
    }
    setCurrentDate(newDate)
    onDateChange?.(newDate)
  }

  // Get items for a specific day
  const getItemsForDay = (date: Date) => {
    return visibleItems.filter(item => 
      isSameDay(item.date, date) ||
      (item.endDate && isWithinInterval(date, { start: item.date, end: item.endDate }))
    )
  }

  // Format the current period title
  const getPeriodTitle = () => {
    switch (viewType) {
      case 'month':
        return format(currentDate, 'MMMM yyyy')
      case 'quarter':
        const quarter = Math.floor(currentDate.getMonth() / 3) + 1
        return `Q${quarter} ${currentDate.getFullYear()}`
      case 'year':
        return currentDate.getFullYear().toString()
      default:
        return format(currentDate, 'MMMM yyyy')
    }
  }

  // Get status icon
  const getStatusIcon = (status: GoalStatus, type: 'goal' | 'milestone') => {
    if (type === 'milestone') {
      return <Diamond className="w-4 h-4" />
    }
    
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />
      case 'in-progress':
        return <Clock className="w-4 h-4" />
      case 'overdue':
        return <AlertTriangle className="w-4 h-4" />
      default:
        return <Target className="w-4 h-4" />
    }
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-gold" />
            Goal Timeline - {getPeriodTitle()}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={navigatePrevious}
              className="p-2"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={navigateNext}
              className="p-2"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Timeline Grid */}
          <div className="grid gap-2" style={{ 
            gridTemplateColumns: viewType === 'year' 
              ? 'repeat(12, 1fr)' 
              : viewType === 'quarter'
                ? 'repeat(7, 1fr)'
                : 'repeat(7, 1fr)'
          }}>
            {/* Header row */}
            {viewType === 'month' && (
              <>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-sm font-medium text-medium-grey p-2">
                    {day}
                  </div>
                ))}
              </>
            )}
            
            {/* Calendar cells */}
            {calendarDays.map(day => {
              const dayItems = getItemsForDay(day)
              const hasItems = dayItems.length > 0
              
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "relative p-2 min-h-[80px] border border-hud-border rounded-lg transition-colors",
                    hasItems && "bg-light-background hover:bg-medium-grey/10",
                    !hasItems && "bg-white hover:bg-light-background"
                  )}
                >
                  {/* Date number */}
                  <div className="text-sm font-medium text-hud-text-primary mb-1">
                    {format(day, viewType === 'year' ? 'MMM' : 'd')}
                  </div>
                  
                  {/* Items for this day */}
                  <div className="space-y-1">
                    {dayItems.map((item, index) => (
                      <div
                        key={`${item.id}-${index}`}
                        className={cn(
                          "flex items-center gap-1 p-1 rounded text-xs cursor-pointer transition-all",
                          "hover:scale-105 hover:shadow-sm",
                          hoveredItem === item.id && "ring-2 ring-gold/20"
                        )}
                        style={{ 
                          backgroundColor: `${item.color}20`,
                          borderLeft: `3px solid ${item.color}`
                        }}
                        onClick={() => {
                          if (item.type === 'goal') {
                            onGoalClick?.(item.data as Goal)
                          } else {
                            onMilestoneClick?.(item.data as Milestone)
                          }
                        }}
                        onMouseEnter={() => setHoveredItem(item.id)}
                        onMouseLeave={() => setHoveredItem(null)}
                      >
                        <div style={{ color: item.color }}>
                          {getStatusIcon(item.status, item.type)}
                        </div>
                        <span className="truncate flex-1" style={{ color: item.color }}>
                          {item.title}
                        </span>
                        {item.progress !== undefined && (
                          <span className="text-xs font-medium" style={{ color: item.color }}>
                            {item.progress}%
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 pt-4 border-t border-hud-border">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-tactical-grey-2000" />
              <span className="text-sm text-medium-grey">Goal</span>
            </div>
            <div className="flex items-center gap-2">
              <Diamond className="w-4 h-4 text-purple-500" />
              <span className="text-sm text-medium-grey">Milestone</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm text-medium-grey">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-tactical-grey-2000" />
              <span className="text-sm text-medium-grey">In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-sm text-medium-grey">Overdue</span>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-hud-border">
            <div className="text-center">
              <div className="text-2xl font-bold text-hud-text-primary">
                {visibleItems.filter(item => item.type === 'goal').length}
              </div>
              <div className="text-sm text-medium-grey">Goals</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-hud-text-primary">
                {visibleItems.filter(item => item.type === 'milestone').length}
              </div>
              <div className="text-sm text-medium-grey">Milestones</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {visibleItems.filter(item => item.status === 'completed').length}
              </div>
              <div className="text-sm text-medium-grey">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {visibleItems.filter(item => item.status === 'overdue').length}
              </div>
              <div className="text-sm text-medium-grey">Overdue</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default GoalTimeline