"use client"

import React from 'react'
import { format } from 'date-fns'
import { Calendar, Clock, ArrowRight, CheckCircle, Circle, AlertCircle, Target } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DailyTask } from '@/types/daily-planner'
import { useGoals } from '@/hooks/useGoals'
import { 
  mockTasks, 
  calculatePlannerStats, 
  getTasksForDate, 
  getUpcomingTasks,
  formatTime,
  getPriorityColorClass
} from '@/lib/daily-planner'

interface DailyPlannerWidgetProps {
  onViewAll?: () => void
}

const DailyPlannerWidget: React.FC<DailyPlannerWidgetProps> = ({ onViewAll }) => {
  const today = new Date()
  const todaysTasks = getTasksForDate(mockTasks, today)
  const stats = calculatePlannerStats(todaysTasks)
  const upcomingTasks = getUpcomingTasks(todaysTasks, 3)
  
  // Get goals data
  const { getUpcomingDeadlines, goals } = useGoals()
  const upcomingGoalDeadlines = getUpcomingDeadlines(1) // Due today or overdue
  const goalsDueToday = upcomingGoalDeadlines.filter(item => {
    const dueDate = new Date('endDate' in item ? item.endDate : item.dueDate)
    return format(dueDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
  })

  return (
    <div className="neo-card flex flex-col w-full h-full">
      <div className="p-6 border-b border-border flex-shrink-0">
        <div className="flex items-center space-x-3">
          <Calendar className="h-5 w-5 text-foreground" />
          <h3 className="text-lg font-bold text-foreground">
            Today's Plan
          </h3>
        </div>

        <div className="text-xs text-muted-foreground mt-1">
          {format(today, 'EEEE, MMMM do')}
        </div>
      </div>

      <div className="p-6 flex-grow flex flex-col overflow-auto">
        {/* Progress Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {stats.completedTasks}
            </div>
            <div className="text-xs text-muted-foreground">
              Done
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">
              {stats.pendingTasks + stats.inProgressTasks}
            </div>
            <div className="text-xs text-muted-foreground">
              Pending
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-muted-foreground">
              {stats.totalTasks}
            </div>
            <div className="text-xs text-muted-foreground">
              Total
            </div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm font-medium text-muted-foreground mb-2">
            <span>Progress</span>
            <span>{Math.round(stats.completionRate)}%</span>
          </div>
          <div className="w-full h-2 bg-background rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-300"
              style={{ width: `${stats.completionRate}%` }}
            ></div>
          </div>
        </div>

        {/* Upcoming Tasks */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground mb-3">
            Up Next
          </h4>
          
          {upcomingTasks.length === 0 ? (
            <div className="text-center py-6">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600 opacity-50" />
              <p className="text-sm text-muted-foreground">
                All tasks completed for today!
              </p>
            </div>
          ) : (
            upcomingTasks.map(task => (
              <UpcomingTaskItem key={task.id} task={task} />
            ))
          )}
        </div>
        
        {/* Goals Due Today */}
        {goalsDueToday.length > 0 && (
          <div className="mt-6 pt-4 border-t border-border">
            <div className="flex items-center space-x-2 mb-3">
              <Target className="h-4 w-4 text-foreground" />
              <h4 className="text-sm font-semibold text-muted-foreground">
                Goals Due Today
              </h4>
            </div>
            <div className="space-y-2">
              {goalsDueToday.slice(0, 2).map(item => (
                <div key={item.id} className="neo-card flex items-center justify-between p-3">
                  <div className="flex items-center space-x-2">
                    <Target className="h-3 w-3 text-orange-500" />
                    <span className="text-sm font-medium text-foreground truncate">
                      {item.title}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {'goalId' in item ? 'Milestone' : 'Goal'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="mt-6 pt-4 border-t border-border">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-foreground">
                {Math.round(stats.totalPlannedHours * 10) / 10}h
              </div>
              <div className="text-xs text-muted-foreground">
                Planned
              </div>
            </div>
            <div>
              <div className="text-lg font-bold text-blue-600">
                {stats.inProgressTasks}
              </div>
              <div className="text-xs text-muted-foreground">
                In Progress
              </div>
            </div>
          </div>
        </div>

        {/* Navigate to full view */}
        {onViewAll && (
          <div className="flex justify-center pt-4 border-t border-border mt-4">
            <button
              className="neo-button text-xs px-3 py-1"
              onClick={onViewAll}
              title="View All Tasks"
            >
              View All <ArrowRight className="h-3 w-3 ml-1" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

interface UpcomingTaskItemProps {
  task: DailyTask
}

const UpcomingTaskItem: React.FC<UpcomingTaskItemProps> = ({ task }) => {
  const getStatusIcon = (status: DailyTask['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'in_progress':
        return <AlertCircle className="h-4 w-4 text-gold" />
      default:
        return <Circle className="h-4 w-4 text-medium-grey" />
    }
  }

  const getPriorityIndicator = (priority: DailyTask['priority']) => {
    const colors = {
      low: 'bg-gray-400',
      medium: 'bg-blue-500',
      high: 'bg-orange-500',
      urgent: 'bg-red-600'
    }
    return colors[priority]
  }

  return (
    <div className="neo-card flex items-center justify-between p-3 cursor-pointer">
      <div className="flex items-center space-x-3 flex-1">
        {getStatusIcon(task.status)}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-foreground text-sm truncate">
            {task.title}
          </div>
          <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
            <Clock className="h-3 w-3" />
            <span>{formatTime(task.startTime)}</span>
            {task.location && (
              <>
                <span>•</span>
                <span className="truncate">{task.location}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2 ml-3">
        {task.serviceType && (
          <Badge
            variant="outline"
            className="text-xs px-2 py-0"
          >
            {task.serviceType.replace('_', ' ')}
          </Badge>
        )}
        <div className={`w-3 h-3 rounded-full ${getPriorityIndicator(task.priority)}`}></div>
      </div>
    </div>
  )
}

export default DailyPlannerWidget
